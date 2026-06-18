import { idnr } from "@navikt/fnrvalidator"
import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { env } from "$env/dynamic/private"
import { validateManualStudentData } from "$lib/data-validation/manual-student-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { upsertStudentInCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { getFrontendOverviewStudents } from "$lib/server/get-frontend-overview-students"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canManageManualStudentsOnSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendOverviewStudentFilter, FrontendStudent, PrincipalAccess } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { ValidationResult } from "$lib/types/data-validation"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, EditorData, NewAppStudent, Period, School, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { generateUUID } from "$lib/utils/uuid"

type GetStudentsResponse = ApiRouteMap[`/api/students${NoSlashString}`]["GET"]["res"]

const getStudents: ApiNextFunction<GetStudentsResponse, void> = async ({ principal, requestEvent }) => {
  const sortBy = requestEvent.url.searchParams.get("sortBy")
  const sortDirection = requestEvent.url.searchParams.get("sortDirection")

  const validSortByValues: FrontendOverviewStudentFilter["sortBy"][] = ["studentName", "className", "contactTeacherName", "lastActivity"]
  const validSortDirectionValues: FrontendOverviewStudentFilter["sortDirection"][] = ["ascending", "descending"]

  if (sortBy && !validSortByValues.includes(sortBy as FrontendOverviewStudentFilter["sortBy"])) {
    throw new HTTPError(400, `Invalid sortBy value. Valid values are: ${validSortByValues.join(", ")}`)
  }

  if (sortDirection && !validSortDirectionValues.includes(sortDirection as FrontendOverviewStudentFilter["sortDirection"])) {
    throw new HTTPError(400, `Invalid sortDirection value. Valid values are: ${validSortDirectionValues.join(", ")}`)
  }

  const hasNoDocuments = requestEvent.url.searchParams.get("hasNoDocuments") === "true" ? true : undefined

  const studentFilter: FrontendOverviewStudentFilter = {
    studentName: requestEvent.url.searchParams.get("studentName") || undefined,
    className: requestEvent.url.searchParams.get("className") || undefined,
    contactTeacherName: requestEvent.url.searchParams.get("contactTeacherName") || undefined,
    studentCheckBoxIds: requestEvent.url.searchParams.getAll("studentCheckBoxIds"),
    templateIds: requestEvent.url.searchParams.getAll("templateIds"),
    hasNoDocuments,
    sortBy: (sortBy as FrontendOverviewStudentFilter["sortBy"]) || undefined,
    sortDirection: (sortDirection as FrontendOverviewStudentFilter["sortDirection"]) || undefined,
    top: Number(requestEvent.url.searchParams.get("top")) || undefined
  }

  // Check that not both hasNoDocuments and templateIds filters are applied at the same time, as this is not supported
  if (studentFilter.hasNoDocuments && studentFilter.templateIds && studentFilter.templateIds.length > 0) {
    throw new HTTPError(400, "Cannot apply both hasNoDocuments and templateIds filters at the same time, as this is not supported")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    logger.info("No access found for principal returning no students")
    return {
      students: [],
      totalStudentCount: 0
    }
  }

  return await getFrontendOverviewStudents(principalAccess, studentFilter)
}

export const GET: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GetStudentsResponse, void>(requestEvent, getStudents)
}

type AddManualStudentResponse = ApiRouteMap["/api/students"]["POST"]["res"]
type AddManualStudentBody = ApiRouteMap["/api/students"]["POST"]["req"]

const addManualStudent: ApiNextFunction<AddManualStudentResponse, AddManualStudentBody> = async ({ principal, body }) => {
  const newManualStudentData: AddManualStudentBody = body

  const newManualStudentDataValid: ValidationResult = validateManualStudentData(newManualStudentData)
  if (!newManualStudentDataValid.valid) {
    throw new HTTPError(400, newManualStudentDataValid.message)
  }

  // authorization check if principal has access to the student or group
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.access.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canManageManualStudentsOnSchool(access, newManualStudentData.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to add manual student to the specified school"))
  }

  if (!(env.MOCK_SSN_CHECK?.trim().toLowerCase() === "true")) {
    const valid = idnr(newManualStudentData.ssn)
    if (valid.status !== "valid") {
      logger.error("Failed to create new manual user. Invalid SSN provided: {SSN}. Validation result: {@ValidationResult}", newManualStudentData.ssn, valid.reasons)
      throw new HTTPError(400, "Ugyldig fødselsnummer. Sjekk at det er riktig og prøv igjen.")
    }
  }

  const schools: School[] = await dbClient.schools.getSchools()
  const schoolRecord: School | undefined = schools.find((school) => school.schoolNumber === newManualStudentData.school.schoolNumber)
  if (!schoolRecord) {
    throw new HTTPError(400, "Den angitte skolen eksisterer ikke")
  }

  const student: FrontendStudent | null = await dbClient.students.getStudentBySsn(newManualStudentData.ssn)
  if (student) {
    if (schoolRecord.source === "AUTO") {
      if (student.studentEnrollments.length === 0) {
        throw new HTTPError(500, "Fødselsnummer er allerede i bruk. Eleven har ingen elevforhold. Ta kontakt med en voksen")
      }

      const schoolName: string = student.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school.name || student.studentEnrollments[0].school.name
      throw new HTTPError(400, `Fødselsnummer er allerede i bruk på ${schoolName}. Ta kontakt med en voksen`)
    }
  }

  const studentId: string = !student ? await handleNewManualStudent(principal, newManualStudentData) : await handleExistingManualStudent(principal, newManualStudentData, student)

  return {
    studentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddManualStudentResponse, AddManualStudentBody>(requestEvent, addManualStudent)
}

const generateManualStudentEnrollment = (manualStudentData: AddManualStudentBody): StudentEnrollment => {
  const period: Period = {
    start: new Date(),
    end: null
  }

  return {
    source: "MANUAL",
    systemId: generateUUID("MANUAL"),
    period,
    school: {
      schoolNumber: manualStudentData.school.schoolNumber,
      name: manualStudentData.school.name
    },
    mainSchool: true,
    classMemberships: [
      {
        classGroup: {
          source: "MANUAL",
          name: `Manuelle elever på ${manualStudentData.school.name}`,
          systemId: `MANUELLE-ELEVER-${manualStudentData.school.name}`,
          teachers: []
        },
        period,
        systemId: generateUUID("MANUAL")
      }
    ],
    contactTeacherGroupMemberships: [],
    teachingGroupMemberships: []
  }
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

  const newAppStudent: NewAppStudent = {
    ssn: manualStudentData.ssn,
    systemId: manualStudentId,
    studentNumber: manualStudentId,
    feideName: manualStudentId,
    name: manualStudentData.name,
    source: "MANUAL",
    created: editorData,
    modified: editorData,
    studentEnrollments: [generateManualStudentEnrollment(manualStudentData)],
    hasBlockedAddress: manualStudentData.hasBlockedAddress ?? false
  }

  const dbClient: IDbClient = getDbClient()

  let studentId: string

  try {
    studentId = await dbClient.students.createManualStudent(newAppStudent)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av manuell bruker", error)
  }

  logger.info("Created manual student with Id {Id} by user {DisplayName} ({PrincipalId})", studentId, principal.displayName, principal.id)

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

  const newStudentEnrollments: StudentEnrollment[] = student.studentEnrollments.map((enrollment: StudentEnrollment) => {
    enrollment.mainSchool = false
    return enrollment
  })

  newStudentEnrollments.push(generateManualStudentEnrollment(manualStudentData))

  const updateAppStudent: UpdateAppStudent = {
    ...student,
    ssn: manualStudentData.ssn,
    studentEnrollments: newStudentEnrollments,
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
    "Updated manual student with Id {Id} by user {DisplayName} ({PrincipalId}), added a manual enrollment to SchoolNumber {SchoolNumber}",
    studentId,
    principal.displayName,
    principal.id,
    manualStudentData.school.schoolNumber
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
