import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { resolveClassContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, NewGroupDocument } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddDocumentResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents`]["POST"]["res"]
type AddDocumentBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents`]["POST"]["req"]

const addDocument: ApiNextFunction<AddDocumentResponse, AddDocumentBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const { classGroup } = await resolveClassContext(principal, systemId)

  const newDocumentData: AddDocumentBody = body

  const validationResult = validateDocument(newDocumentData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid document data: ${validationResult.message}`)
  }

  // create document
  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newDocument: NewGroupDocument = {
    title: newDocumentData.title,
    school: newDocumentData.school,
    template: newDocumentData.template,
    content: newDocumentData.content,
    messages: [],
    documentAccess: newDocumentData.documentAccess,
    group: {
      systemId
    },
    emailAlertReceivers: newDocumentData.emailAlertReceivers || [],
    created: editorData,
    modified: editorData
  }

  const dbClient: IDbClient = getDbClient()

  let documentId: string

  try {
    documentId = await dbClient.documents.createGroupDocument(newDocument)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av klassenotat", error)
  }

  logger.info(`Group document created with ID ${documentId} by user ${principal.displayName} (${principal.id})`)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "GroupDocument",
      resourceId: documentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          groupName: classGroup.name
        }),
        parentResource: "Group",
        parentResourceId: systemId,
        schoolId: newDocument.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating GroupDocumentId {GroupDocumentId}", documentId)
  }

  return {
    documentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentResponse, AddDocumentBody>(requestEvent, addDocument)
}
