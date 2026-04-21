import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canCreateStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, NewStudentDocument } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { validateDocument } from "$lib/data-validation/document-validation"

type AddDocumentResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents`]["POST"]["res"]
type AddDocumentBody = ApiRouteMap[`/api/students/${NoSlashString}/documents`]["POST"]["req"]

const addDocument: ApiNextFunction<AddDocumentResponse, AddDocumentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  // authorization check if principal has access to the student
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot add document for non-existing student.")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)
  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to add document"))
  }

  const newDocumentData: AddDocumentBody = body

  const validationResult = validateDocument(newDocumentData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid document data: ${validationResult.message}`)
  }

  if (!canCreateStudentDocument(principalAccessForStudent, newDocumentData)) {
    throw new HTTPError(403, noAccessMessage("No permission to add document for the specified school"))
  }

  // create document
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

  if (!newDocument.student?._id) {
    throw new HTTPError(400, "Student ID is missing in the document data")
  }

  const dbClient: IDbClient = getDbClient()

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
