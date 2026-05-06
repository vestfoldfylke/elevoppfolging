import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateDocumentContentTemplate } from "$lib/data-validation/document-content-template-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type UpdateDocumentContentTemplateResponse = ApiRouteMap[`/api/templates/${NoSlashString}`]["PUT"]["res"]
type UpdateDocumentContentTemplateBody = ApiRouteMap[`/api/templates/${NoSlashString}`]["PUT"]["req"]

const updateDocumentContentTemplate: ApiNextFunction<UpdateDocumentContentTemplateResponse, UpdateDocumentContentTemplateBody> = async ({ requestEvent, principal, body }) => {
  const templateId = requestEvent.params.template_id

  if (!templateId) {
    throw new HTTPError(400, "template id from url params is missing?")
  }

  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, noAccessMessage("No permission to update template"))
  }

  const updateTemplateData: UpdateDocumentContentTemplateBody = body
  const validationResult = validateDocumentContentTemplate(updateTemplateData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid template data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()
  const currentTemplate = await dbClient.documentContentTemplates.getDocumentContentTemplateById(templateId)

  if (!currentTemplate) {
    throw new HTTPError(404, "Document content template not found, cannot update non-existing template...")
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const documentTemplate: NewDocumentContentTemplate = {
    name: updateTemplateData.name,
    version: currentTemplate.version + 1,
    availableForDocumentType: updateTemplateData.availableForDocumentType,
    content: updateTemplateData.content,
    created: currentTemplate.created,
    modified: editorData,
    sort: updateTemplateData.sort
  }

  const updatedTemplateId: string = await dbClient.documentContentTemplates.updateDocumentContentTemplate(templateId, documentTemplate)

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
      resource: "Template",
      resourceId: templateId,
      resourceName: documentTemplate.name,
      metaData: {
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating TemplateId {TemplateId}", templateId)
  }

  return {
    updatedTemplateId
  }
}

export const PUT: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentContentTemplateResponse, UpdateDocumentContentTemplateBody>(requestEvent, updateDocumentContentTemplate)
}

type DeleteDocumentContentTemplateResponse = ApiRouteMap[`/api/templates/${NoSlashString}`]["DELETE"]["res"]

const deleteDocumentContentTemplate: ApiNextFunction<DeleteDocumentContentTemplateResponse> = async ({ requestEvent, principal }) => {
  const templateId = requestEvent.params.template_id

  if (!templateId) {
    throw new HTTPError(400, "template id from url params is missing?")
  }

  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, noAccessMessage("No permission to delete template"))
  }

  const dbClient = getDbClient()
  const currentTemplate = await dbClient.documentContentTemplates.getDocumentContentTemplateById(templateId)

  if (!currentTemplate) {
    throw new HTTPError(404, "Document content template not found, cannot delete non-existing template...")
  }

  await dbClient.documentContentTemplates.deleteDocumentContentTemplate(templateId)

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
      resource: "Template",
      resourceId: templateId,
      resourceName: currentTemplate.name,
      metaData: {
        data: JSON.stringify({
          version: currentTemplate.version
        }),
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when deleting TemplateId {TemplateId}", templateId)
  }

  return {
    deletedTemplateId: templateId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteDocumentContentTemplateResponse>(requestEvent, deleteDocumentContentTemplate)
}
