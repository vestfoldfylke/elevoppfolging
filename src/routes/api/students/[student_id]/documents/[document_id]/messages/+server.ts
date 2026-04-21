import type { RequestHandler } from "@sveltejs/kit"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAddMessageToStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
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

  // authorization check if principal has access to the student or group
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot create document for non-existing student.")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)
  if (principalAccessForStudent.length === 0) {
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

  const dbClient: IDbClient = getDbClient()

  const currentDocument = await dbClient.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot add message to non-existing document...")
  }

  if (!canAddMessageToStudentDocument(principalAccessForStudent, currentDocument)) {
    throw new HTTPError(403, noAccessMessage("No permission to add message to document"))
  }

  const messageId = await dbClient.addDocumentMessage(documentId, newMessage)

  // TODO update lastActivityTimestamp for the student

  return {
    messageId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentMessageResponse, AddDocumentMessageBody>(requestEvent, addDocumentMessage)
}
