import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { resolveClassContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeAddMessageToGroupDocument } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, GroupDocument, NewDocumentMessage, School } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddDocumentMessageResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}/messages`]["POST"]["res"]
type AddDocumentMessageBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}/messages`]["POST"]["req"]

const addDocumentMessage: ApiNextFunction<AddDocumentMessageResponse, AddDocumentMessageBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const documentId: string | undefined = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument: GroupDocument | null = await dbClient.documents.getGroupDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Klassenotat ikke funnet")
  }

  const { classes, classGroup } = await resolveClassContext(principal, systemId)

  const authorizationResult = authorizeAddMessageToGroupDocument({ document: currentDocument, principalClasses: classes })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  if (currentDocument.group.systemId !== systemId) {
    throw new HTTPError(400, "Klassenotat tilhører ikke den angitte klassen!")
  }

  const newMessageData: DocumentMessageInput = body
  const validationResult = validateDocumentMessage(newMessageData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid message data: ${validationResult.message}`)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newMessage: NewDocumentMessage = {
    type: "update",
    created: editorData,
    modified: editorData,
    content: {
      title: newMessageData.content.title,
      text: newMessageData.content.text
    },
    emailAlertReceivers: newMessageData.emailAlertReceivers || []
  }

  const school: School | null = await dbClient.schools.getSchool(currentDocument.school.schoolNumber)
  if (!school) {
    throw new HTTPError(404, "Skole ikke funnet")
  }

  let messageId: string

  try {
    messageId = await dbClient.documents.addGroupDocumentMessage(documentId, school.name, school.schoolNumber, newMessage)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av oppdatering på klassenotat", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "GroupDocumentMessage",
      resourceId: messageId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          groupName: classGroup.name
        }),
        parentResource: "GroupDocument",
        parentResourceId: documentId,
        schoolId: currentDocument.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating GroupDocumentMessageId {GroupDocumentMessageId}", messageId)
  }

  return {
    messageId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentMessageResponse, AddDocumentMessageBody>(requestEvent, addDocumentMessage)
}
