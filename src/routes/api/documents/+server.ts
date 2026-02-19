import type { RequestHandler } from "@sveltejs/kit"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewDocument } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddDocumentResponse = ApiRouteMap["/api/documents"]["POST"]["res"]
type AddDocumentBody = ApiRouteMap["/api/documents"]["POST"]["req"]

const addDocumentMessage: ApiNextFunction<AddDocumentResponse, AddDocumentBody> = async ({ principal, body }) => {
  const newDocumentData: AddDocumentBody = body
  // TODO validate body

  // TODO authorization check if principal has access to the student or group

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date().toISOString()
  }

  if (newDocumentData.student?._id && newDocumentData.group?.systemId) {
    throw new HTTPError(400, "A document cannot be associated with both a student and a group.")
  }

  const newDocument: NewDocument = {
    title: newDocumentData.title,
    school: newDocumentData.school,
    template: newDocumentData.template,
    content: newDocumentData.content,
    messages: newDocumentData.messages,
    created: editorData,
    modified: editorData
  }

  if (newDocumentData.student?._id) {
    newDocument.student = {
      _id: newDocumentData.student._id
    }
  }

  if (newDocumentData.group?.systemId) {
    newDocument.group = {
      systemId: newDocumentData.group.systemId
    }
  }

  const dbClient = getDbClient()

  if (newDocument.student?._id) {
    const student = await dbClient.getStudentById(newDocument.student._id)
    if (!student) {
      throw new HTTPError(400, "Student not found. Cannot create document for non-existing student.")
    }
  }

  const documentId = await dbClient.createDocument(newDocument)

  return {
    documentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentResponse, AddDocumentBody>(requestEvent, addDocumentMessage)
}
