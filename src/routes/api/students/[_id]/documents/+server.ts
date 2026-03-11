import type { RequestHandler } from "@sveltejs/kit"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentDocument } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { logger } from "@vestfoldfylke/loglady"

type AddDocumentResponse = ApiRouteMap[`/api/students/${string}/documents`]["POST"]["res"]
type AddDocumentBody = ApiRouteMap[`/api/students/${string}/documents`]["POST"]["req"]

const addDocument: ApiNextFunction<AddDocumentResponse, AddDocumentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params._id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }
  
  const newDocumentData: AddDocumentBody = body
  // TODO validate body

  // TODO authorization check if principal has access to the student or group
  // Har brukeren tilgang til eleven på DENNE skolen

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newDocument: NewStudentDocument = {
    title: newDocumentData.title,
    school: newDocumentData.school,
    template: newDocumentData.template,
    content: newDocumentData.content,
    messages: [],
    student: {
      _id: studentId
    },
    created: editorData,
    modified: editorData
  }

  const dbClient = getDbClient()

  if (newDocument.student?._id) {
    const student = await dbClient.getStudentById(newDocument.student._id)
    if (!student) {
      throw new HTTPError(400, "Student not found. Cannot create document for non-existing student.")
    }
  }

  const documentId = await dbClient.createStudentDocument(newDocument)

  logger.info(`Document created with ID ${documentId} by user ${principal.displayName} (${principal.id})`)

  // TODO update lastActivityTimestamp for the student

  return {
    documentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentResponse, AddDocumentBody>(requestEvent, addDocument)
}
