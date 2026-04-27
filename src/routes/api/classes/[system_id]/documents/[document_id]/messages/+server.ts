import type { RequestHandler } from "@sveltejs/kit"
import { validateDocumentMessage } from "$lib/data-validation/document-message-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentMessageInput, EditorData, GroupDocument, NewDocumentMessage, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

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
    }
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument: GroupDocument | null = await dbClient.getGroupDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot add message to non-existing document...")
  }

  const messageId = await dbClient.addGroupDocumentMessage(documentId, newMessage)

  return {
    messageId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentMessageResponse, AddDocumentMessageBody>(requestEvent, addDocumentMessage)
}
