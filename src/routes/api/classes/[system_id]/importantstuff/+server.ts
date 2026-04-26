import type { RequestHandler } from "@sveltejs/kit"
import { validateGroupImportantStuffData } from "$lib/data-validation/group-important-stuff-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { EditorData, GroupImportantStuffInput, NewGroupImportantStuff, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

type PatchGroupImportantStuffResponse = ApiRouteMap[`/api/classes/${NoSlashString}/importantstuff`]["PATCH"]["res"]
type PatchGroupImportantStuffBody = ApiRouteMap[`/api/classes/${NoSlashString}/importantstuff`]["PATCH"]["req"]

const updateGroupImportantStuff: ApiNextFunction<PatchGroupImportantStuffResponse, PatchGroupImportantStuffBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const students: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)
  if (students.length === 0) {
    throw new HTTPError(404, noAccessMessage("No access to any students"))
  }

  const classes: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, students)
  if (classes.length === 0 || !classes.find((classEntry: StudentClassGroup) => classEntry.systemId === systemId)) {
    throw new HTTPError(404, noAccessMessage("No access to class"))
  }

  const groupImportantStuffData: GroupImportantStuffInput = body

  const validationResult = validateGroupImportantStuffData(groupImportantStuffData)

  if (!validationResult.valid) {
    throw new HTTPError(400, "Invalid request body", { details: validationResult.message })
  }

  const dbClient = getDbClient()

  const currentImportantStuff = await dbClient.getGroupImportantStuff(systemId)

  const editor: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const upsertStudentImportantStuffData: NewGroupImportantStuff = {
    type: "GROUP",
    school: groupImportantStuffData.school,
    importantInfo: groupImportantStuffData.importantInfo,
    lastActivityTimestamp: new Date(),
    modified: editor,
    created: currentImportantStuff && currentImportantStuff.length > 0 ? currentImportantStuff[0].created : editor
  }

  const importantStuffId: string = await dbClient.upsertGroupImportantStuff(systemId, upsertStudentImportantStuffData)

  return {
    importantStuffId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<PatchGroupImportantStuffResponse, PatchGroupImportantStuffBody>(requestEvent, updateGroupImportantStuff)
}
