import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateGroupImportantStuffData } from "$lib/data-validation/group-important-stuff-validation"
import { resolveClassContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, GroupImportantStuffInput, NewGroupImportantStuff } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type PatchGroupImportantStuffResponse = ApiRouteMap[`/api/classes/${NoSlashString}/importantstuff`]["PATCH"]["res"]
type PatchGroupImportantStuffBody = ApiRouteMap[`/api/classes/${NoSlashString}/importantstuff`]["PATCH"]["req"]

const updateGroupImportantStuff: ApiNextFunction<PatchGroupImportantStuffResponse, PatchGroupImportantStuffBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const { classGroup } = await resolveClassContext(principal, systemId)

  const groupImportantStuffData: GroupImportantStuffInput = body

  const validationResult = validateGroupImportantStuffData(groupImportantStuffData)

  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid request body: ${validationResult.message}`)
  }

  const dbClient = getDbClient()

  const currentImportantStuff = await dbClient.importantStuff.getGroupImportantStuff(systemId)

  const editorData: EditorData = {
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
    modified: editorData,
    created: currentImportantStuff && currentImportantStuff.length > 0 ? currentImportantStuff[0].created : editorData
  }

  let importantStuffId: string

  try {
    importantStuffId = await dbClient.importantStuff.upsertGroupImportantStuff(systemId, upsertStudentImportantStuffData)
  } catch (error) {
    if (currentImportantStuff && currentImportantStuff.length > 0) {
      throw new HTTPError(500, "Feilet ved oppdatering av viktig informasjon for klasse", error)
    }

    throw new HTTPError(500, "Feilet ved opprettelse av viktig informasjon for klasse", error)
  }

  if (currentImportantStuff && currentImportantStuff.length > 0) {
    try {
      await dbClient.auditLogs.createAuditEntry({
        created: editorData,
        action: "UPDATE",
        resource: "ImportantStuff",
        resourceId: importantStuffId,
        resourceName: "",
        metaData: {
          data: JSON.stringify({
            groupName: classGroup.name
          }),
          parentResource: "Group",
          parentResourceId: systemId,
          schoolId: upsertStudentImportantStuffData.school.schoolNumber
        }
      })
    } catch (error) {
      logger.errorException(error, "Failed to create audit entry when updating ImportantStuffId {ImportantStuffId} for group", importantStuffId)
    }

    return {
      importantStuffId
    }
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "ImportantStuff",
      resourceId: importantStuffId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          groupName: classGroup.name
        }),
        parentResource: "Group",
        parentResourceId: systemId,
        schoolId: upsertStudentImportantStuffData.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating ImportantStuffId {ImportantStuffId} for group", importantStuffId)
  }

  return {
    importantStuffId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<PatchGroupImportantStuffResponse, PatchGroupImportantStuffBody>(requestEvent, updateGroupImportantStuff)
}
