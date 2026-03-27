import { idnr } from "@navikt/fnrvalidator"
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateNewManualStudentData } from "$lib/data-validation/manual-student-validation"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canCreateManualStudentOnSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { FrontendStudent } from "$lib/types/app-types"
import type { ValidationResult } from "$lib/types/data-validation"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, EditorData, NewAppStudent, Period, StudentEnrollment } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { generateUUID } from "$lib/utils/uuid"

type AddManualStudentResponse = ApiRouteMap["/api/students"]["POST"]["res"]
type AddManualStudentBody = ApiRouteMap["/api/students"]["POST"]["req"]

const addManualStudent: ApiNextFunction<AddManualStudentResponse, AddManualStudentBody> = async ({ principal, body }) => {
  const newManualStudentData: AddManualStudentBody = body

  const newManualStudentDataValid: ValidationResult = validateNewManualStudentData(newManualStudentData)
  if (!newManualStudentDataValid.valid) {
    throw new HTTPError(400, newManualStudentDataValid.message)
  }

  // authorization check if principal has access to the student or group
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canCreateManualStudentOnSchool(access, newManualStudentData.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to add manual student to the specified school"))
  }

  const valid = idnr(newManualStudentData.ssn)
  if (valid.status !== "valid") {
    throw new HTTPError(400, valid.reasons.join(", "))
  }

  const student: FrontendStudent | null = await dbClient.getStudentBySsn(newManualStudentData.ssn)
  if (student) {
    if (student.studentEnrollments.length === 0) {
      throw new HTTPError(500, "Fødselsnummer er allerede i bruk. Eleven har ingen elevforhold. Hvordan skal vi forholde oss til dette da? Ta kontakt med en voksen")
    }

    const schoolName: string = student.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school.name || student.studentEnrollments[0].school.name
    throw new HTTPError(400, `Fødselsnummer er allerede i bruk på ${schoolName}. Ta kontakt med en voksen på denne skolen, eller no?`)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const period: Period = {
    start: new Date(),
    end: null
  }

  const manualStudentId: string = generateUUID("MANUAL")
  const manualEnrollmentId: string = generateUUID("MANUAL")
  const manualClassMembershipId: string = generateUUID("MANUAL")

  const newAppStudent: NewAppStudent = {
    ssn: newManualStudentData.ssn,
    systemId: manualStudentId,
    studentNumber: manualStudentId,
    feideName: manualStudentId,
    name: newManualStudentData.name,
    source: "MANUAL",
    created: editorData,
    modified: editorData,
    studentEnrollments: [
      {
        source: "MANUAL",
        systemId: manualEnrollmentId,
        period,
        school: {
          schoolNumber: newManualStudentData.school.schoolNumber,
          name: newManualStudentData.school.name
        },
        mainSchool: true,
        classMemberships: [
          {
            classGroup: {
              source: "MANUAL",
              name: `Manuelle elever på ${newManualStudentData.school.name}`,
              systemId: `MANUELLE-ELEVER-${newManualStudentData.school.name}`,
              teachers: []
            },
            period,
            systemId: manualClassMembershipId
          }
        ],
        contactTeacherGroupMemberships: [],
        teachingGroupMemberships: []
      }
    ]
  }

  const studentId: string = await dbClient.createManualStudent(newAppStudent)

  logger.info("Created manual student with Id {Id} by user {DisplayName} ({PrincipalId})", studentId, principal.displayName, principal.id)

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddManualStudentResponse, AddManualStudentBody>(requestEvent, addManualStudent)
}
