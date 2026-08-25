import { idnr } from "@navikt/fnrvalidator"
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { env } from "$env/dynamic/private"
import { validateManualStudentData } from "$lib/data-validation/manual-student-validation.js"
import { upsertStudentInCache } from "$lib/server/cache/students-cache.js"
import { getDbClient } from "$lib/server/db/get-db-client.js"
import { HTTPError } from "$lib/server/middleware/http-error.js"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request.js"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map.js"
import type { FrontendStudent, ManualStudentCreateOrReactivate } from "$lib/types/app-types.js"
import type { AuthenticatedPrincipal } from "$lib/types/authentication.js"
import type { ValidationResult } from "$lib/types/data-validation.js"
import type { IDbClient } from "$lib/types/db/db-client.js"
import type { EditorData, NewAppStudent, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types.js"
import type { ApiNextFunction } from "$lib/types/middleware/http-request.js"
import { canCreateOrReactivateManualStudent, generateManualStudentEnrollment } from "$lib/utils/manual-students.js"
import { isActive } from "$lib/utils/period.js"
import { generateUUID } from "$lib/utils/uuid.js"

type GetCanCreateOrReactivateManualStudentResponse = ApiRouteMap[`/api/manualstudents${NoSlashString}`]["GET"]["res"]

const getCanCreateOrReactivateManualStudent: ApiNextFunction<GetCanCreateOrReactivateManualStudentResponse, void> = async ({ principal, requestEvent }) => {
  const manualStudentSsn: string | null = requestEvent.url.searchParams.get("ssn")
  if (!manualStudentSsn) {
    throw new HTTPError(400, "Student SSN is missing in search parameters")
  }

  const schoolNumber: string | null = requestEvent.url.searchParams.get("schoolNumber")
  if (!schoolNumber) {
    throw new HTTPError(400, "schoolNumber is missing in search parameters")
  }

  return canCreateOrReactivateManualStudent(manualStudentSsn, schoolNumber, principal)
}

export const GET: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GetCanCreateOrReactivateManualStudentResponse, void>(requestEvent, getCanCreateOrReactivateManualStudent)
}

type AddManualStudentResponse = ApiRouteMap[`/api/manualstudents${NoSlashString}`]["POST"]["res"]
type AddManualStudentBody = ApiRouteMap[`/api/manualstudents${NoSlashString}`]["POST"]["req"]

const addManualStudent: ApiNextFunction<AddManualStudentResponse, AddManualStudentBody> = async ({ principal, body }) => {
  const newManualStudentData: AddManualStudentBody = body

  const newManualStudentDataValid: ValidationResult = validateManualStudentData(newManualStudentData)
  if (!newManualStudentDataValid.valid) {
    throw new HTTPError(400, newManualStudentDataValid.message)
  }

  const dbClient: IDbClient = getDbClient()

  if (!(env.MOCK_SSN_CHECK?.trim().toLowerCase() === "true")) {
    const valid = idnr(newManualStudentData.ssn)
    if (valid.status !== "valid") {
      logger.error("Failed to create new manual user. Invalid SSN provided: {SSN}. Validation result: {@ValidationResult}", newManualStudentData.ssn, valid.reasons)
      throw new HTTPError(400, "Ugyldig fødselsnummer. Sjekk at det er riktig og prøv igjen.")
    }
  }

  // authorization check is done here amongst other stuff
  const canCreate: ManualStudentCreateOrReactivate = await canCreateOrReactivateManualStudent(newManualStudentData.ssn, newManualStudentData.school.schoolNumber, principal)
  if (!canCreate.allowed) {
    throw new HTTPError(403, canCreate.message as string, canCreate)
  }

  if (canCreate.type !== "CREATE") {
    logger.error(
      "addManualStudent POST action received type {Type}, and is not allowed here! CanCreateOrReactivateManualStudentData: {@CanCreateOrReactivateManualStudentData}",
      canCreate.type,
      canCreate
    )
    throw new HTTPError(403, `${canCreate.type} is not allowed for addManualStudent`)
  }

  const student: FrontendStudent | null = await dbClient.students.getStudentBySsn(newManualStudentData.ssn)

  const studentId: string = !student ? await handleNewManualStudent(principal, newManualStudentData) : await handleExistingManualStudent(principal, newManualStudentData, student)

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddManualStudentResponse, AddManualStudentBody>(requestEvent, addManualStudent)
}

const handleNewManualStudent = async (principal: AuthenticatedPrincipal, manualStudentData: AddManualStudentBody): Promise<string> => {
  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const manualStudentId: string = generateUUID("MANUAL")
  const isMainSchool: boolean = true

  const newAppStudent: NewAppStudent = {
    ssn: manualStudentData.ssn,
    systemId: manualStudentId,
    studentNumber: manualStudentId,
    feideName: manualStudentId,
    name: manualStudentData.name,
    source: "MANUAL",
    created: editorData,
    modified: editorData,
    studentEnrollments: [generateManualStudentEnrollment(manualStudentData.school, isMainSchool)],
    hasBlockedAddress: manualStudentData.hasBlockedAddress ?? false
  }

  const dbClient: IDbClient = getDbClient()

  let studentId: string

  try {
    studentId = await dbClient.students.createManualStudent(newAppStudent)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av manuell bruker", error)
  }

  logger.info(
    "Created manual student with Id {Id} by user {DisplayName} ({PrincipalId}). Added a manual enrollment to SchoolNumber {SchoolNumber}. MainSchool set to {IsMainSchool}",
    studentId,
    principal.displayName,
    principal.id,
    manualStudentData.school.schoolNumber,
    isMainSchool
  )

  const frontendStudent: FrontendStudent = {
    _id: studentId,
    systemId: newAppStudent.systemId,
    studentNumber: newAppStudent.studentNumber,
    feideName: newAppStudent.feideName,
    name: newAppStudent.name,
    source: newAppStudent.source,
    studentEnrollments: newAppStudent.studentEnrollments,
    created: newAppStudent.created,
    modified: newAppStudent.modified,
    hasBlockedAddress: newAppStudent.hasBlockedAddress ?? false
  }

  await upsertStudentInCache(frontendStudent)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "ManualUser",
      resourceId: studentId,
      resourceName: newAppStudent.name,
      metaData: {
        parentResource: "School",
        parentResourceId: manualStudentData.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating ManualStudentId {ManualStudentId}", studentId)
  }

  return studentId
}

const handleExistingManualStudent = async (principal: AuthenticatedPrincipal, manualStudentData: AddManualStudentBody, student: FrontendStudent): Promise<string> => {
  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const hasActiveMainSchool: boolean = student.studentEnrollments.some((enrollment: StudentEnrollment) => enrollment.mainSchool && isActive(enrollment.period))

  const updatedStudentEnrollments: StudentEnrollment[] = [...student.studentEnrollments, generateManualStudentEnrollment(manualStudentData.school, !hasActiveMainSchool)]

  const updateAppStudent: UpdateAppStudent = {
    ...student,
    ssn: manualStudentData.ssn,
    studentEnrollments: updatedStudentEnrollments,
    modified: editorData
  }

  const dbClient: IDbClient = getDbClient()

  let studentId: string

  try {
    studentId = await dbClient.students.updateStudent(updateAppStudent)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av manuell bruker", error)
  }

  logger.info(
    "Updated manual student with Id {Id} by user {DisplayName} ({PrincipalId}), added a manual enrollment to SchoolNumber {SchoolNumber}. MainSchool set to {IsMainSchool}",
    studentId,
    principal.displayName,
    principal.id,
    manualStudentData.school.schoolNumber,
    !hasActiveMainSchool
  )

  const frontendStudent: FrontendStudent = {
    _id: studentId,
    systemId: updateAppStudent.systemId,
    studentNumber: updateAppStudent.studentNumber,
    feideName: updateAppStudent.feideName,
    name: updateAppStudent.name,
    source: updateAppStudent.source,
    studentEnrollments: updateAppStudent.studentEnrollments,
    created: updateAppStudent.created,
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
        parentResourceId: manualStudentData.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating ManualStudentId {ManualStudentId}", studentId)
  }

  return studentId
}
