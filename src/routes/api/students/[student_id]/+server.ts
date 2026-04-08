import { idnr } from "@navikt/fnrvalidator"
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateManualStudentData } from "$lib/data-validation/manual-student-validation"
import { upsertStudentInCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canManageManualStudentsOnSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendStudent } from "$lib/types/app-types"
import type { ValidationResult } from "$lib/types/data-validation"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppStudent, EditorData, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type UpdateManualStudentResponse = ApiRouteMap[`/api/students/${NoSlashString}`]["POST"]["res"]
type UpdateManualStudentBody = ApiRouteMap[`/api/students/${NoSlashString}`]["POST"]["req"]

const updateManualStudent: ApiNextFunction<UpdateManualStudentResponse, UpdateManualStudentBody> = async ({ principal, body }) => {
  const updateManualStudentData: UpdateManualStudentBody = body

  const updateManualStudentDataValid: ValidationResult = validateManualStudentData(updateManualStudentData)
  if (!updateManualStudentDataValid.valid) {
    throw new HTTPError(400, updateManualStudentDataValid.message)
  }

  // authorization check if principal has access to the student
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canManageManualStudentsOnSchool(access, updateManualStudentData.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to update manual student on the specified school"))
  }

  // fetch student
  const student: AppStudent | null = await dbClient.getManualStudentById(updateManualStudentData.studentId)
  if (!student) {
    throw new HTTPError(404, "Student not found")
  }

  if (student.source !== "MANUAL") {
    throw new HTTPError(403, noAccessMessage("Cannot update student that is registered in source system"))
  }

  if (updateManualStudentData.ssn !== student.ssn) {
    const valid = idnr(updateManualStudentData.ssn)
    if (valid.status !== "valid") {
      throw new HTTPError(400, valid.reasons.join(", "))
    }

    // trenger å sjekke om nytt ssn allerede er i bruk
    const studentBySsn: FrontendStudent | null = await dbClient.getStudentBySsn(updateManualStudentData.ssn)
    if (studentBySsn) {
      if (student.studentEnrollments.length === 0) {
        throw new HTTPError(500, "Fødselsnummer er allerede i bruk. Eleven dette tilhører har ingen elevforhold. Hvordan skal vi forholde oss til dette da? Ta kontakt med en voksen")
      }

      const schoolName: string = student.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school.name || student.studentEnrollments[0].school.name
      throw new HTTPError(400, `Fødselsnummer er allerede i bruk på ${schoolName}. Ta kontakt med en voksen på denne skolen, eller no?`)
    }
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updateAppStudent: UpdateAppStudent = {
    _id: student._id,
    ssn: updateManualStudentData.ssn,
    systemId: student.systemId,
    studentNumber: student.studentNumber,
    source: student.source,
    feideName: student.feideName,
    name: updateManualStudentData.name,
    created: student.created,
    modified: editorData,
    studentEnrollments: student.studentEnrollments
  }

  const studentId: string = await dbClient.updateManualStudent(updateAppStudent)

  logger.info("Updated manual student with Id {Id} by user {DisplayName} ({PrincipalId})", student._id, principal.displayName, principal.id)

  const frontendStudent: FrontendStudent = {
    _id: student._id,
    systemId: student.systemId,
    studentNumber: student.studentNumber,
    feideName: student.feideName,
    name: updateAppStudent.name,
    source: student.source,
    studentEnrollments: student.studentEnrollments,
    created: student.created,
    modified: updateAppStudent.modified
  }

  upsertStudentInCache(frontendStudent)

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateManualStudentResponse, UpdateManualStudentBody>(requestEvent, updateManualStudent)
}
