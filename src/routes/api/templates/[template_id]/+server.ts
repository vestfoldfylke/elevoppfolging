import type { RequestHandler } from "@sveltejs/kit"
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

  const updateTemplateData: UpdateDocumentContentTemplateBody = body
  // TODO validate body

  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, noAccessMessage("No permission to update template"))
  }

  const dbClient = getDbClient()
  const currentTemplate = await dbClient.getDocumentContentTemplateById(templateId)

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

  const updatedTemplateId = await dbClient.updateDocumentContentTemplate(templateId, documentTemplate)

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
  const currentTemplate = await dbClient.getDocumentContentTemplateById(templateId)

  if (!currentTemplate) {
    throw new HTTPError(404, "Document content template not found, cannot delete non-existing template...")
  }

  await dbClient.deleteDocumentContentTemplate(templateId)

  return {
    deletedTemplateId: templateId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteDocumentContentTemplateResponse>(requestEvent, deleteDocumentContentTemplate)
}
