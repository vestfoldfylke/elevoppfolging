import type { RequestHandler } from "@sveltejs/kit"
import { validateStudentImportantStuffData } from "$lib/data-validation/student-important-stuff-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditStudentImportantStuff, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { EditorData, NewStudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type PatchImportantStuffResponse = ApiRouteMap[`/api/students/${NoSlashString}/importantstuff`]["PATCH"]["res"]
type PatchImportantStuffBody = ApiRouteMap[`/api/students/${NoSlashString}/importantstuff`]["PATCH"]["req"]

const updateStudentImportantStuff: ApiNextFunction<PatchImportantStuffResponse, PatchImportantStuffBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId || typeof studentId !== "string") {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  // Authorization
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const currentStudent: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!currentStudent) {
    throw new HTTPError(404, "Student not found, cannot consent to non-existing student")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(currentStudent, principalAccess)
  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to student"))
  }

  const studentImportantStuffData: StudentImportantStuffInput = body

  const validationResult = validateStudentImportantStuffData(studentImportantStuffData)

  if (!validationResult.valid) {
    throw new HTTPError(400, "Invalid request body", { details: validationResult.message })
  }

  const canEditImportantStuff = canEditStudentImportantStuff(studentImportantStuffData.school.schoolNumber, principalAccessForStudent)
  if (!canEditImportantStuff) {
    throw new HTTPError(403, noAccessMessage("Insufficient access level to edit student important stuff"))
  }

  const dbClient = getDbClient()

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
