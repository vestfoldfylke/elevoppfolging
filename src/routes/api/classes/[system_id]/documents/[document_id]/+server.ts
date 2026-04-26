import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditGroupDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, GroupDocument, GroupDocumentUpdate, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

type UpdateDocumentResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["req"]

const updateDocument: ApiNextFunction<UpdateDocumentResponse, UpdateDocumentBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
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

  const dbClient: IDbClient = getDbClient()

  const currentDocument: GroupDocument | null = await dbClient.getGroupDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot update non-existing document")
  }

  if (!canEditGroupDocument(principal, currentDocument)) {
    throw new HTTPError(403, noAccessMessage("No permission to edit the document"))
  }

  if (currentDocument.group.systemId !== systemId) {
    throw new HTTPError(400, "System ID in the document data does not match the System ID in the request parameters - what are you doing!!")
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

  const updatedDocument: GroupDocumentUpdate = {
    title: updateDocumentData.title,
    school: updateDocumentData.school,
    template: currentDocument.template,
    content: updateDocumentData.content,
    documentAccess: updateDocumentData.documentAccess,
    modified: editorData,
    created: currentDocument.created
  }

  const updatedDocumentId = await dbClient.updateGroupDocument(documentId, updatedDocument)

  logger.info(`Document with ID ${documentId} updated by user ${principal.displayName} (${principal.id})`)

  return {
    documentId: updatedDocumentId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentResponse, UpdateDocumentBody>(requestEvent, updateDocument)
}
