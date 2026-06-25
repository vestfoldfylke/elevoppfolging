import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { resolveStudentContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeEditMessageInStudentDocument } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, NewDocumentMessage, School } from "$lib/types/db/shared-types"
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

  const { student, principalAccessForStudent } = await resolveStudentContext(principal, studentId)

  const dbClient: IDbClient = getDbClient()

  const currentDocument = await dbClient.documents.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Elevnotat ikke funnet")
  }

  if (currentDocument.student._id !== studentId) {
    throw new HTTPError(400, "Elevnotat tilhører ikke den angitte eleven!")
  }

  const messageToUpdate = currentDocument.messages.find((message) => message.messageId === messageId)
  if (!messageToUpdate) {
    throw new HTTPError(404, "Oppdatering ikke funnet")
  }

  const authorizationResult = authorizeEditMessageInStudentDocument({
    authenticatedPrincipal: principal,
    document: currentDocument,
    message: messageToUpdate,
    accessToStudent: principalAccessForStudent
  })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const updateMessageData: DocumentMessageInput = body
  const validationResult = validateDocumentMessage(updateMessageData)
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

  const updatedMessageData: NewDocumentMessage = {
    type: "update",
    created: messageToUpdate.created,
    modified: editorData,
    content: {
      title: updateMessageData.content.title,
      text: updateMessageData.content.text
    },
    emailAlertReceivers: messageToUpdate.emailAlertReceivers || [] // in case the existing message doesn't have emailAlertReceivers
  }

  const school: School | null = await dbClient.schools.getSchool(currentDocument.school.schoolNumber)
  if (!school) {
    throw new HTTPError(404, "Skole ikke funnet")
  }

  let updatedMessageId: string

  try {
    updatedMessageId = await dbClient.documents.updateStudentDocumentMessage(documentId, messageId, school.name, school.schoolNumber, updatedMessageData)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av oppdatering på elevnotat", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "StudentDocumentMessage",
      resourceId: updatedMessageId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          studentName: student.name
        }),
        parentResource: "StudentDocument",
        parentResourceId: documentId,
        schoolId: currentDocument.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating StudentDocumentMessageId {StudentDocumentMessageId}", updatedMessageId)
  }

  try {
    await dbClient.importantStuff.updateStudentLastActivityTimestamp(studentId, currentDocument.school)
  } catch (error) {
    logger.errorException(
      error,
      "Failed to update student {feideName} last activity timestamp after updating document message {messageId} on document {documentId} for school {schoolNumber}. Returning updatedMessageId regardless",
      student.feideName,
      messageId,
      documentId,
      currentDocument.school.schoolNumber
    )
  }

  return {
    updatedMessageId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentMessageResponse, UpdateDocumentMessageBody>(requestEvent, updateDocumentMessage)
}
