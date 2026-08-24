import { generateManualStudentEnrollment } from "$lib/utils/manual-students.js";
import { isActive } from "$lib/utils/period.js";
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { upsertStudentInCache } from "$lib/server/cache/students-cache.js"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppStudent, EditorData, School, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddManualStudentEnrollmentResponse = ApiRouteMap[`/api/manualstudents/${NoSlashString}/enrollments`]["POST"]["res"]
type AddManualStudentEnrollmentBody = ApiRouteMap[`/api/manualstudents/${NoSlashString}/enrollments`]["POST"]["req"]

const addManualStudentEnrollment: ApiNextFunction<AddManualStudentEnrollmentResponse, AddManualStudentEnrollmentBody> = async ({ principal, requestEvent, body }) => {
  const manualStudentEnrollmentData: AddManualStudentEnrollmentBody = body

  const manualStudentId: string | undefined = requestEvent.params.student_id
  if (!manualStudentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  if (!manualStudentEnrollmentData.schoolNumber) {
    throw new HTTPError(400, "schoolNumber missing in body")
  }

  // authorization check if principal has access to the student
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.access.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }

  const authorizationResult = authorizeManageManualStudentsOnSchool({ principalAccess: access, schoolNumber: manualStudentEnrollmentData.schoolNumber })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const student: AppStudent | null = await dbClient.students.getStudentById(manualStudentId)
  if (!student) {
    throw new HTTPError(404, "Elev ikke funnet")
  }

  const school: School | null = await dbClient.schools.getSchool(manualStudentEnrollmentData.schoolNumber)
  if (!school) {
    throw new HTTPError(404, "Skole ikke funnet")
  }

  const hasActiveMainSchool: boolean = student.studentEnrollments.some((enrollment: StudentEnrollment) => enrollment.mainSchool && isActive(enrollment.period))

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  student.studentEnrollments.push(generateManualStudentEnrollment(school, !hasActiveMainSchool))

  const updateAppStudent: UpdateAppStudent = {
    ...student,
    modified: editorData
  }

  let studentId: string

  try {
    studentId = await dbClient.students.updateStudent(updateAppStudent)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av nytt manuelt elevforhold på manuell bruker", error)
  }

  logger.info("Added manual enrollment to manual student with Id {Id} by user {DisplayName} ({PrincipalId})", student._id, principal.displayName, principal.id)

  const frontendStudent: FrontendStudent = {
    _id: student._id,
    systemId: student.systemId,
    studentNumber: student.studentNumber,
    feideName: student.feideName,
    name: student.name,
    source: student.source,
    studentEnrollments: student.studentEnrollments,
    created: student.created,
    modified: updateAppStudent.modified,
    hasBlockedAddress: student.hasBlockedAddress ?? false
  }

  await upsertStudentInCache(frontendStudent)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "ManualUser",
      resourceId: studentId,
      resourceName: student.name,
      metaData: {
        parentResource: "School",
        parentResourceId: manualStudentEnrollmentData.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when adding manual enrollment to ManualStudentId {ManualStudentId}", studentId)
  }

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddManualStudentEnrollmentResponse, AddManualStudentEnrollmentBody>(requestEvent, addManualStudentEnrollment)
}
