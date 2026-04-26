import type { RequestHandler } from "@sveltejs/kit"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canUpdateMessageInGroupDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, GroupDocument, NewDocumentMessage, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

type UpdateDocumentMessageResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}/messages/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentMessageBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}/messages/${NoSlashString}`]["PATCH"]["req"]

const updateDocumentMessage: ApiNextFunction<UpdateDocumentMessageResponse, UpdateDocumentMessageBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const messageId = requestEvent.params.message_id
  if (!messageId) {
    throw new HTTPError(400, "Message ID is missing in request parameters")
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

  const updateMessageData: DocumentMessageInput = body
  const validationResult = validateDocumentMessage(updateMessageData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid message data: ${validationResult.message}`)
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument: GroupDocument | null = await dbClient.getGroupDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot update message to non-existing document...")
  }

  const messageToUpdate = currentDocument.messages.find((message) => message.messageId === messageId)
  if (!messageToUpdate) {
    throw new HTTPError(404, "Message not found, cannot update non-existing message...")
  }

  if (!canUpdateMessageInGroupDocument(principal, messageToUpdate)) {
    throw new HTTPError(403, noAccessMessage("No permission to update message on document"))
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updatedMessageData: NewDocumentMessage = {
    type: "update",
    created: messageToUpdate.created,
    modified: editorData,
    content: {
      title: updateMessageData.content.title,
      text: updateMessageData.content.text
    }
  }

  const updatedMessageId = await dbClient.updateGroupDocumentMessage(documentId, messageId, updatedMessageData)

  return {
    updatedMessageId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentMessageResponse, UpdateDocumentMessageBody>(requestEvent, updateDocumentMessage)
}
