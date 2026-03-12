import type { RequestHandler } from "@sveltejs/kit"
import { validateStudentImportantStuffData } from "$lib/data-validation/student-important-stuff"
import { getStudentAccessInfo } from "$lib/server/authorization/student-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditStudentImportantStuff } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type PatchImportantStuffResponse = ApiRouteMap[`/api/students/${string}/importantstuff`]["PATCH"]["res"]
type PatchImportantStuffBody = ApiRouteMap[`/api/students/${string}/importantstuff`]["PATCH"]["req"]

const updateStudentImportantStuff: ApiNextFunction<PatchImportantStuffResponse, PatchImportantStuffBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params._id
  if (!studentId || typeof studentId !== "string") {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  // Authorization
  const dbClient = getDbClient()

  const principalAccess = await dbClient.getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, "Access denied: No access found for the principal")
  }

  const currentStudent = await dbClient.getStudentById(studentId)
  if (!currentStudent) {
    throw new HTTPError(404, "Student not found, cannot consent to non-existing student")
  }

  const accessInfo = getStudentAccessInfo(currentStudent, principalAccess)
  if (accessInfo.length === 0) {
    throw new HTTPError(403, "Access denied: No access to the student")
  }

  const studentImportantStuffData: StudentImportantStuffInput = body

  const validationResult = validateStudentImportantStuffData(studentImportantStuffData)

  if (!validationResult.valid) {
    throw new HTTPError(400, "Invalid request body", { details: validationResult.message })
  }

  const canEditImportantStuff = canEditStudentImportantStuff(studentImportantStuffData.school.schoolNumber, accessInfo)
  if (!canEditImportantStuff) {
    throw new HTTPError(403, "Access denied: Insufficient access level to edit student important stuff")
  }

  const allStudentCheckBoxes = await dbClient.getStudentCheckBoxes()

  for (const checkBoxId of studentImportantStuffData.followUp) {
    if (!allStudentCheckBoxes.some((checkBox) => checkBox._id === checkBoxId)) {
      throw new HTTPError(400, `Invalid follow-up checkbox ID: ${checkBoxId} - not found in student checkboxes`)
    }
  }

  for (const checkBoxId of studentImportantStuffData.facilitation) {
    if (!allStudentCheckBoxes.some((checkBox) => checkBox._id === checkBoxId)) {
      throw new HTTPError(400, `Invalid facilitation checkbox ID: ${checkBoxId} - not found in student checkboxes`)
    }
  }

  const currentImportantStuff = await dbClient.getStudentImportantStuff(studentId, [studentImportantStuffData.school.schoolNumber])

  const editor: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const upsertStudentImportantStuffData: NewStudentImportantStuff = {
    type: "STUDENT",
    school: studentImportantStuffData.school,
    importantInfo: studentImportantStuffData.importantInfo,
    followUp: studentImportantStuffData.followUp,
    facilitation: studentImportantStuffData.facilitation,
    lastActivityTimestamp: new Date(),
    modified: editor,
    created: currentImportantStuff && currentImportantStuff.length > 0 ? currentImportantStuff[0].created : editor
  }

  const importantStuffId = await dbClient.upsertStudentImportantStuff(studentId, upsertStudentImportantStuffData)

  return {
    importantStuffId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<PatchImportantStuffResponse, PatchImportantStuffBody>(requestEvent, updateStudentImportantStuff)
}
