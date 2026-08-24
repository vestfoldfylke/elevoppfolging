import { idnr } from "@navikt/fnrvalidator"
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { env } from "$env/dynamic/private"
import { validateManualStudentData } from "$lib/data-validation/manual-student-validation.js"
import { upsertStudentInCache } from "$lib/server/cache/students-cache.js"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { type AuthorizationResult, authorizeManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendStudent } from "$lib/types/app-types"
import type { ValidationResult } from "$lib/types/data-validation.js"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppStudent, EditorData, School, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { isActive } from "$lib/utils/period.js"

type GetCanCreateOrReactivateManualStudentResponse = ApiRouteMap[`/api/manualstudents/${NoSlashString}`]["GET"]["res"]

const getCanCreateOrReactivateManualStudent: ApiNextFunction<GetCanCreateOrReactivateManualStudentResponse, void> = async ({ principal, requestEvent }) => {
  const manualStudentSsn: string | undefined = requestEvent.params.student_id
  if (!manualStudentSsn) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const schoolNumber: string | null = requestEvent.url.searchParams.get("schoolNumber")
  if (!schoolNumber) {
    throw new HTTPError(400, "schoolNumber is missing in search parameters")
  }

  // authorization check if principal has access to the student or group
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.access.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }

  const authorizationResult: AuthorizationResult = authorizeManageManualStudentsOnSchool({ principalAccess: access, schoolNumber })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const schools: School[] = await dbClient.schools.getSchools()
  const schoolRecord: School | undefined = schools.find((school: School) => school.schoolNumber === schoolNumber)
  if (!schoolRecord) {
    throw new HTTPError(400, "Den angitte skolen eksisterer ikke")
  }

  const student: FrontendStudent | null = await dbClient.students.getStudentBySsn(manualStudentSsn)
  if (!student) {
    return {
      student,
      type: "CREATE",
      allowed: true
    }
  }

  const activeEnrollments: StudentEnrollment[] = student.studentEnrollments.filter((enrollment: StudentEnrollment) => isActive(enrollment.period)) ?? []
  let enrollmentMessage: string = `Elev med navn '${student.name}'`

  if (activeEnrollments.length === 0) {
    enrollmentMessage += " har ingen aktive elevforhold."
  } else if (activeEnrollments.length === 1) {
    enrollmentMessage += ` har ett aktivt elevforhold ved ${activeEnrollments[0].school.name}.`
  } else {
    enrollmentMessage += ` har aktivt elevforhold ved ${activeEnrollments.length} skoler: ${activeEnrollments.map((enrollment: StudentEnrollment) => enrollment.school.name).join(", ")}.`
  }

  return {
    student,
    type: activeEnrollments.length === 0 ? "REACTIVATE" : "ADD_MANUAL_ENROLLMENT",
    allowed: schoolRecord.source === "MANUAL" ? true : activeEnrollments.length === 0,
    message: enrollmentMessage
  }
}

export const GET: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GetCanCreateOrReactivateManualStudentResponse, void>(requestEvent, getCanCreateOrReactivateManualStudent)
}

type UpdateManualStudentResponse = ApiRouteMap[`/api/manualstudents/${NoSlashString}`]["POST"]["res"]
type UpdateManualStudentBody = ApiRouteMap[`/api/manualstudents/${NoSlashString}`]["POST"]["req"]

const updateManualStudent: ApiNextFunction<UpdateManualStudentResponse, UpdateManualStudentBody> = async ({ principal, body }) => {
  const updateManualStudentData: UpdateManualStudentBody = body

  const updateManualStudentDataValid: ValidationResult = validateManualStudentData(updateManualStudentData)
  if (!updateManualStudentDataValid.valid) {
    throw new HTTPError(400, updateManualStudentDataValid.message)
  }

  // authorization check if principal has access to the student
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.access.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }

  const authorizationResult = authorizeManageManualStudentsOnSchool({ principalAccess: access, schoolNumber: updateManualStudentData.school.schoolNumber })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  // fetch student
  const student: AppStudent | null = await dbClient.students.getStudentById(updateManualStudentData.studentId)
  if (!student) {
    throw new HTTPError(404, "Elev ikke funnet")
  }

  if (student.source !== "MANUAL") {
    throw new HTTPError(403, "Kan ikke oppdatere elev registrert i kildesystemet")
  }

  if (updateManualStudentData.ssn !== student.ssn) {
    if (!(env.MOCK_SSN_CHECK?.trim().toLowerCase() === "true")) {
      const valid = idnr(updateManualStudentData.ssn)
      if (valid.status !== "valid") {
        logger.error("Failed to update manual user. Invalid SSN provided: {SSN}. Validation result: {@ValidationResult}", updateManualStudentData.ssn, valid.reasons)
        throw new HTTPError(400, "Ugyldig fødselsnummer. Sjekk at det er riktig og prøv igjen.")
      }
    }

    // trenger å sjekke om nytt ssn allerede er i bruk
    const studentBySsn: FrontendStudent | null = await dbClient.students.getStudentBySsn(updateManualStudentData.ssn)
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
    ...student,
    ssn: updateManualStudentData.ssn,
    name: updateManualStudentData.name,
    modified: editorData,
    hasBlockedAddress: updateManualStudentData.hasBlockedAddress ?? false
  }

  let studentId: string

  try {
    studentId = await dbClient.students.updateStudent(updateAppStudent)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av manuell bruker", error)
  }

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
    modified: updateAppStudent.modified,
    hasBlockedAddress: updateAppStudent.hasBlockedAddress ?? false
  }

  await upsertStudentInCache(frontendStudent)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "ManualUser",
      resourceId: studentId,
      resourceName: updateAppStudent.name,
      metaData: {
        parentResource: "School",
        parentResourceId: student.studentEnrollments.find((studentEnrollment: StudentEnrollment) => studentEnrollment.mainSchool)?.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating ManualStudentId {ManualStudentId}", studentId)
  }

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateManualStudentResponse, UpdateManualStudentBody>(requestEvent, updateManualStudent)
}
