import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditGroupDocument, isSchoolLeaderForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, GroupDocument, GroupDocumentUpdate, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"

type RemoveDocumentResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}`]["DELETE"]["res"]

type UpdateDocumentResponse = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentBody = ApiRouteMap[`/api/classes/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["req"]

const removeDocument: ApiNextFunction<RemoveDocumentResponse> = async ({ principal, requestEvent }) => {
  const documentId: string | undefined = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new HTTPError(400, "System ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const document: GroupDocument | null = await dbClient.documents.getGroupDocumentById(documentId)
  if (!document) {
    throw new HTTPError(404, "Klassenotat ikke funnet")
  }

  if (document.isDocumentLocked) {
    throw new HTTPError(403, "Klassenotatet er låst og kan ikke slettes")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
  }

  if (!isSchoolLeaderForSchool(principalAccess, document.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til å slette dette klassenotatet"))
  }

  const students: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)
  if (students.length === 0) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til noen elever"))
  }

  const classes: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, students)
  if (classes.length === 0) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til noen klasser"))
  }

  const classEntry: StudentClassGroup | undefined = classes.find((classEntry: StudentClassGroup) => classEntry.systemId === systemId)
  if (!classEntry) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til klassen"))
  }

  try {
    await dbClient.documents.deleteGroupDocument(document)
    logger.info("Group document with GroupDocumentId {GroupDocumentId} deleted successfully by PrincipalId {PrincipalId}", document._id, principal.id)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved sletting av klassenotat", error)
  }

  try {
    await dbClient.emailAlerts.deleteEmailAlertsByDocumentId(document._id)
  } catch (error) {
    logger.errorException(error, "Failed to delete email alerts for GroupDocumentId {GroupDocumentId} after deleting the document. Returning success response regardless.", document._id)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      },
      action: "DELETE",
      resource: "GroupDocument",
      resourceId: documentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          groupName: classEntry.name,
          template: document.template
        }),
        parentResource: "Group",
        parentResourceId: systemId,
        schoolId: document.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing GroupDocumentId {GroupDocumentId}", document._id)
  }

  return {
    documentId
  }
}

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
    throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
  }

  const students: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)
  if (students.length === 0) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til noen elever"))
  }

  const classes: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, students)
  if (classes.length === 0) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til noen klasser"))
  }

  const classEntry: StudentClassGroup | undefined = classes.find((classEntry: StudentClassGroup) => classEntry.systemId === systemId)
  if (!classEntry) {
    throw new HTTPError(404, noAccessMessage("Ingen tilgang til klassen"))
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument: GroupDocument | null = await dbClient.documents.getGroupDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Klassenotat ikke funnet")
  }

  if (!canEditGroupDocument(principal, currentDocument)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til å redigere klassenotatet"))
  }

  if (currentDocument.group.systemId !== systemId) {
    throw new HTTPError(400, "System ID in the document data does not match the System ID in the request parameters - what are you doing!!")
  }

  if (currentDocument.isDocumentLocked) {
    throw new HTTPError(403, "Klassenotatet er låst og kan ikke redigeres")
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
    emailAlertReceivers: currentDocument.emailAlertReceivers || [],
    modified: editorData,
    created: currentDocument.created
  }

  let updatedDocumentId: string

  try {
    updatedDocumentId = await dbClient.documents.updateGroupDocument(documentId, updatedDocument)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av klassenotat", error)
  }

  logger.info(`Group document with ID ${documentId} updated by user ${principal.displayName} (${principal.id})`)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "GroupDocument",
      resourceId: updatedDocumentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          groupName: classEntry.name
        }),
        parentResource: "Group",
        parentResourceId: systemId,
        schoolId: currentDocument.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating GroupDocumentId {GroupDocumentId}", updatedDocumentId)
  }

  return {
    documentId: updatedDocumentId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<RemoveDocumentResponse>(requestEvent, removeDocument)
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentResponse, UpdateDocumentBody>(requestEvent, updateDocument)
}
