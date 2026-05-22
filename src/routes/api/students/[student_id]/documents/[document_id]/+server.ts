import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocument } from "$lib/data-validation/document-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditStudentDocument, isSchoolLeaderForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { EditorData, StudentDocument, StudentDocumentUpdate } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type RemoveDocumentResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}`]["DELETE"]["res"]

type UpdateDocumentResponse = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["res"]
type UpdateDocumentBody = ApiRouteMap[`/api/students/${NoSlashString}/documents/${NoSlashString}`]["PATCH"]["req"]

const removeDocument: ApiNextFunction<RemoveDocumentResponse> = async ({ principal, requestEvent }) => {
  const documentId: string | undefined = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const studentId: string | undefined = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const document: StudentDocument | null = await dbClient.documents.getStudentDocumentById(documentId)
  if (!document) {
    throw new HTTPError(404, "Document not found. Cannot delete non-existing document.")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!isSchoolLeaderForSchool(principalAccess, document.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to delete this document"))
  }

  try {
    await dbClient.documents.deleteStudentDocument(document)
    logger.info("Student document with StudentDocumentId {StudentDocumentId} deleted successfully by PrincipalId {PrincipalId}", document._id, principal.id)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved sletting av elevnotat", error)
  }

  try {
    await dbClient.emailAlerts.deleteEmailAlertsByDocumentId(document._id)
  } catch (error) {
    logger.errorException(error, "Failed to delete email alerts for StudentDocumentId {StudentDocumentId} after deleting the document. Returning success response regardless.", document._id)
  }

  try {
    const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
    const studentName: string = student?.name || ""

    await dbClient.auditLogs.createAuditEntry({
      created: {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      },
      action: "DELETE",
      resource: "StudentDocument",
      resourceId: documentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          studentName,
          template: document.template
        }),
        parentResource: "Student",
        parentResourceId: studentId,
        schoolId: document.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing StudentDocumentId {StudentDocumentId}", document._id)
  }

  return {
    documentId
  }
}

const updateDocument: ApiNextFunction<UpdateDocumentResponse, UpdateDocumentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const documentId = requestEvent.params.document_id
  if (!documentId) {
    throw new HTTPError(400, "Document ID is missing in request parameters")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(400, "Student not found. Cannot edit the document for non-existing student.")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)
  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to edit the document"))
  }

  const dbClient: IDbClient = getDbClient()

  const currentDocument = await dbClient.documents.getStudentDocumentById(documentId)
  if (!currentDocument) {
    throw new HTTPError(404, "Document not found, cannot update non-existing document")
  }

  if (!canEditStudentDocument(principal, principalAccessForStudent, currentDocument)) {
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
    documentAccess: updateDocumentData.documentAccess,
    modified: editorData,
    created: currentDocument.created,
    emailAlertReceivers: currentDocument.emailAlertReceivers || [] // in case the existing document doesn't have emailAlertReceivers
  }

  let updatedDocumentId: string

  try {
    updatedDocumentId = await dbClient.documents.updateStudentDocument(documentId, updatedDocument)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av elevnotat", error)
  }

  logger.info(`Student document with ID ${documentId} updated by user ${principal.displayName} (${principal.id})`)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      },
      action: "UPDATE",
      resource: "StudentDocument",
      resourceId: updatedDocumentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          studentName: student.name
        }),
        parentResource: "Student",
        parentResourceId: studentId,
        schoolId: updatedDocument.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating StudentDocumentId {StudentDocumentId}", updatedDocumentId)
  }

  try {
    await dbClient.importantStuff.updateStudentLastActivityTimestamp(studentId, updateDocumentData.school)
  } catch (error) {
    logger.errorException(
      error,
      "Failed to update student {feideName} last activity timestamp after updating document {documentId} for school {schoolNumber}. Returning documentId regardless",
      student.feideName,
      documentId,
      updateDocumentData.school
    )
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
