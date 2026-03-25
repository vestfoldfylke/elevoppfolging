import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { getPrincipalAccessEntriesForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { AccessEntry, CachedFrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, EditorData, StudentDocumentUpdate } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type UpdateDocumentResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentBody = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["req"]

const updateDocument: ApiNextFunction<UpdateDocumentResponse, UpdateDocumentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot edit the document for non-existing student.")
  }

  const accessToStudent: AccessEntry[] = getPrincipalAccessEntriesForStudent(student, access)
  if (accessToStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to edit the document"))
  }

  const currentDocument = await dbClient.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot update non-existing document")
  }

  if (!canEditStudentDocument(principal, accessToStudent, currentDocument)) {
    throw new HTTPError(403, noAccessMessage("No permission to edit the document"))
  }

  if (currentDocument.student._id !== studentId) {
    throw new HTTPError(400, "Student ID in the document data does not match the student ID in the request parameters - what are you doing!!")
  }

  const updateDocumentData: UpdateDocumentBody = body

  const validationResult = validateDocument(updateDocumentData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid document data: ${validationResult.message}`)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updatedDocument: StudentDocumentUpdate = {
    title: updateDocumentData.title,
    school: updateDocumentData.school,
    template: currentDocument.template,
    content: updateDocumentData.content,
    modified: editorData,
    created: currentDocument.created
  }

  const updatedDocumentId = await dbClient.updateStudentDocument(documentId, updatedDocument)

  logger.info(`Document with ID ${documentId} updated by user ${principal.displayName} (${principal.id})`)

  // TODO update lastActivityTimestamp for the student

  return {
    documentId: updatedDocumentId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentResponse, UpdateDocumentBody>(requestEvent, updateDocument)
}
