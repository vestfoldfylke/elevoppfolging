import type { RequestHandler } from "@sveltejs/kit"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { DocumentMessageInput, EditorData, NewDocumentMessage } from "$lib/types/db/shared-types"
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

  const dbClient = getDbClient()

  // TODO authorization check if principal has access to the document
  const currentDocument = await dbClient.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot add message to non-existing document...")
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
