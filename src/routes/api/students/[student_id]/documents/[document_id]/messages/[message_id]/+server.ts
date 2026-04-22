import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canUpdateMessageInStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, NewDocumentMessage } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type UpdateDocumentMessageResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}/messages/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentMessageBody = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}/messages/${NoSlashString}`]["PATCH"]["req"]

const updateDocumentMessage: ApiNextFunction<UpdateDocumentMessageResponse, UpdateDocumentMessageBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
  if (!documentId || typeof documentId !== "string") {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const messageId = requestEvent.params.message_id
  if (!messageId || typeof messageId !== "string") {
    throw new HTTPError(400, "Message ID is missing in request parameters")
  }

  // authorization check if principal has access to the student
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot update document message for non-existing student.")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)
  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to update message in document"))
  }

  const updateMessageData: DocumentMessageInput = body
  const validationResult = validateDocumentMessage(updateMessageData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid message data: ${validationResult.message}`)
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument = await dbClient.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot add message to non-existing document...")
  }

  const messageToUpdate = currentDocument.messages.find(message => message.messageId === messageId)
  if (!messageToUpdate) {
    throw new HTTPError(404, "Message not found, cannot update non-existing message...")
  }

  if (!canUpdateMessageInStudentDocument(principal, principalAccessForStudent, currentDocument, messageToUpdate)) {
    throw new HTTPError(403, noAccessMessage("No permission to add message to document"))
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

  const updatedMessageId = await dbClient.updateDocumentMessage(documentId, messageId, updatedMessageData)

  try {
    await dbClient.updateStudentLastActivityTimestamp(studentId, currentDocument.school)
  } catch (error) {
    logger.errorException(
      error,
      "Failed to update student {feideName} last activity timestamp after updating document message {messageId} on document {documentId} for school {schoolNumber}. Returning updatedMessageId regardless",
      student.feideName,
      messageId,
      documentId,
      currentDocument.school
    )
  }

  return {
    updatedMessageId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentMessageResponse, UpdateDocumentMessageBody>(requestEvent, updateDocumentMessage)
}
