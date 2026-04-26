import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, NewGroupDocument, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

type AddDocumentResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents`]["POST"]["res"]
type AddDocumentBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents`]["POST"]["req"]

const addDocument: ApiNextFunction<AddDocumentResponse, AddDocumentBody> = async ({ requestEvent, principal, body }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
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

  const newDocumentData: AddDocumentBody = body

  const validationResult = validateDocument(newDocumentData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid document data: ${validationResult.message}`)
  }

  // create document
  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newDocument: NewGroupDocument = {
    title: newDocumentData.title,
    school: newDocumentData.school,
    template: newDocumentData.template,
    content: newDocumentData.content,
    messages: [],
    documentAccess: newDocumentData.documentAccess,
    group: {
      systemId
    },
    created: editorData,
    modified: editorData
  }

  const dbClient: IDbClient = getDbClient()

  const documentId = await dbClient.createGroupDocument(newDocument)

  logger.info(`Document created with ID ${documentId} by user ${principal.displayName} (${principal.id})`)

  return {
    documentId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentResponse, AddDocumentBody>(requestEvent, addDocument)
}
