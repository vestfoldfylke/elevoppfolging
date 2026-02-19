import type { RequestHandler } from "@sveltejs/kit"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type UpdateDocumentContentTemplateResponse = ApiRouteMap["/api/templates/[_id]"]["PUT"]["res"]
type UpdateDocumentContentTemplateBody = ApiRouteMap["/api/templates/[_id]"]["PUT"]["req"]

const updateDocumentContentTemplate: ApiNextFunction<UpdateDocumentContentTemplateResponse, UpdateDocumentContentTemplateBody> = async ({ requestEvent, principal, body }) => {
  const templateId = requestEvent.params._id

  if (!templateId) {
    throw new HTTPError(400, "template id from url params is missing?")
  }

  const updateTemplateData: UpdateDocumentContentTemplateBody = body
  // TODO validate body

  // TODO authorization check if principal has access to create template

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
    at: new Date().toISOString()
  }

  const documentTemplate: NewDocumentContentTemplate = {
    name: updateTemplateData.name,
    version: currentTemplate.version + 1,
    availableForDocumentType: updateTemplateData.availableForDocumentType,
    content: updateTemplateData.content,
    created: currentTemplate.created,
    modified: editorData
  }

  const updatedTemplateId = await dbClient.updateDocumentContentTemplate(templateId, documentTemplate)

  return {
    updatedTemplateId
  }
}

export const PUT: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateDocumentContentTemplateResponse, UpdateDocumentContentTemplateBody>(requestEvent, updateDocumentContentTemplate)
}

type DeleteDocumentContentTemplateResponse = ApiRouteMap["/api/templates/[_id]"]["DELETE"]["res"]

const deleteDocumentContentTemplate: ApiNextFunction<DeleteDocumentContentTemplateResponse> = async ({ requestEvent }) => {
  const templateId = requestEvent.params._id

  if (!templateId) {
    throw new HTTPError(400, "template id from url params is missing?")
  }

  // TODO authorization check if principal has access to delete template

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
