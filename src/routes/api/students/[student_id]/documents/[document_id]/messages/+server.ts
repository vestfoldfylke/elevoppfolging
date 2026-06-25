import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { ObjectId } from "mongodb"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { isValidEmail } from "$lib/data-validation/email-validation"
import { resolveStudentContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeAddMessageToStudentDocument } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, NewDbEmailAlert, NewDocumentMessage, School } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { generateEmailAlertBody, generateEmailAlertReceivers } from "$lib/utils/email-alerts"

type AddDocumentMessageResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}/messages`]["POST"]["res"]
type AddDocumentMessageBody = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}/messages`]["POST"]["req"]

const addDocumentMessage: ApiNextFunction<AddDocumentMessageResponse, AddDocumentMessageBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
  if (!documentId || typeof documentId !== "string") {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument = await dbClient.documents.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Elevnotat ikke funnet")
  }

  if (currentDocument.student._id !== studentId) {
    throw new HTTPError(400, "Elevnotat tilhører ikke den angitte eleven!")
  }

  const { student, principalAccessForStudent } = await resolveStudentContext(principal, studentId)

  const studentDataSharingConsent = await dbClient.studentDataSharingConsents.getStudentDataSharingConsent(studentId)

  const authorizationResult = authorizeAddMessageToStudentDocument({
    authenticatedPrincipal: principal,
    accessToStudent: principalAccessForStudent,
    document: currentDocument,
    studentDataSharingConsent
  })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
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

  const validEmailAlertReceivers = newMessageData.emailAlertReceivers.filter((email) => {
    if (!isValidEmail(email)) {
      logger.warn(`Invalid email address "${email.replace(/[^a-zA-Z0-9@. ]/g, "")}" in emailAlertReceivers for new document message for student ${studentId}. This email address will be ignored.`)
      return false
    }
    return true
  })

  const newMessage: NewDocumentMessage = {
    type: "update",
    created: editorData,
    modified: editorData,
    content: {
      title: newMessageData.content.title,
      text: newMessageData.content.text
    },
    emailAlertReceivers: validEmailAlertReceivers
  }

  const school: School | null = await dbClient.schools.getSchool(currentDocument.school.schoolNumber)
  if (!school) {
    throw new HTTPError(404, "Skole ikke funnet")
  }

  let messageId: string

  try {
    messageId = await dbClient.documents.addStudentDocumentMessage(documentId, school.name, school.schoolNumber, newMessage)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av oppdatering på elevnotat", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "StudentDocumentMessage",
      resourceId: messageId,
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
    logger.errorException(error, "Failed to create audit entry when creating StudentDocumentMessageId {StudentDocumentMessageId}", messageId)
  }

  try {
    await dbClient.importantStuff.updateStudentLastActivityTimestamp(studentId, currentDocument.school)
  } catch (error) {
    logger.errorException(
      error,
      "Failed to update student {feideName} last activity timestamp after adding document message on document {documentId} for school {schoolNumber}. Returning messageId regardless",
      student.feideName,
      documentId,
      currentDocument.school.schoolNumber
    )
  }

  if (newMessage.emailAlertReceivers.length === 0) {
    return {
      messageId
    }
  }

  const emailAlert: NewDbEmailAlert = {
    type: "DOCUMENT_MESSAGE_CREATED",
    documentId: new ObjectId(documentId),
    receivers: generateEmailAlertReceivers(newMessage.emailAlertReceivers),
    status: "QUEUED",
    created: editorData,
    alertBody: generateEmailAlertBody(documentId, student, "DOCUMENT_MESSAGE_CREATED")
  }

  try {
    const emailAlertId: string = await dbClient.emailAlerts.createEmailAlert(school.name, school.schoolNumber, emailAlert)

    try {
      await dbClient.auditLogs.createAuditEntry({
        created: editorData,
        action: "CREATE",
        resource: "EmailAlert",
        resourceId: emailAlertId,
        resourceName: "",
        metaData: {
          data: JSON.stringify({
            documentId,
            studentName: student.name
          }),
          parentResource: "StudentDocumentMessage",
          parentResourceId: messageId,
          schoolId: currentDocument.school.schoolNumber
        }
      })
    } catch (error) {
      logger.errorException(error, "Failed to create audit entry when creating EmailAlertId {EmailAlertId} for new student document message", emailAlertId)
    }
  } catch (error) {
    logger.errorException(
      error,
      "Failed to create email alert for document message {messageId} on document {documentId} for student {studentId}. Returning messageId regardless, alert will not be sent...",
      messageId,
      documentId,
      studentId
    )
  }

  return {
    messageId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentMessageResponse, AddDocumentMessageBody>(requestEvent, addDocumentMessage)
}
