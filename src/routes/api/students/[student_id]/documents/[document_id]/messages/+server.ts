import type { RequestHandler } from "@sveltejs/kit"
import { getStudentAccessInfo } from "$lib/server/authorization/student-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAddMessageToStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { AccessEntry, FrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, DocumentMessageInput, EditorData, NewDocumentMessage } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

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

  // authorization check if principal has access to the student or group
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: FrontendStudent | null = await dbClient.getStudentById(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot create document for non-existing student.")
  }

  const accessToStudent: AccessEntry[] = getStudentAccessInfo(student, access)
  if (accessToStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to add message to document"))
  }

  const newMessageData: DocumentMessageInput = body
  // TODO validate body

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  let newMessage: NewDocumentMessage

  console.log("Received new message data:", newMessageData)

  switch (newMessageData.type) {
    case "comment": {
      if (!newMessageData.content || typeof newMessageData.content.text !== "string") {
        throw new HTTPError(400, "Comment text is required and must be a string.")
      }
      newMessage = {
        type: "comment",
        created: editorData,
        modified: editorData,
        content: {
          text: newMessageData.content.text
        }
      }
      break
    }
    case "update": {
      if (!newMessageData.content || typeof newMessageData.content.text !== "string" || typeof newMessageData.content.title !== "string") {
        throw new HTTPError(400, "Update title and text are required and must be strings.")
      }
      newMessage = {
        type: "update",
        created: editorData,
        modified: editorData,
        content: {
          title: newMessageData.content.title,
          text: newMessageData.content.text
        }
      }
      break
    }
  }

  const currentDocument = await dbClient.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot add message to non-existing document...")
  }

  if (!canAddMessageToStudentDocument(accessToStudent, currentDocument)) {
    throw new HTTPError(403, noAccessMessage("No permission to add message to document"))
  }

  const createdMessage = await dbClient.addDocumentMessage(documentId, newMessage)

  // TODO update lastActivityTimestamp for the student

  return {
    messageId: createdMessage.messageId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentMessageResponse, AddDocumentMessageBody>(requestEvent, addDocumentMessage)
}
