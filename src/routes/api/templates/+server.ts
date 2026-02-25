import type { RequestHandler } from "@sveltejs/kit"
import { getDbClient } from "$lib/server/db/get-db-client"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddDocumentContentTemplateResponse = ApiRouteMap["/api/templates"]["POST"]["res"]
type AddDocumentContentTemplateBody = ApiRouteMap["/api/templates"]["POST"]["req"]

const addDocumentContentTemplate: ApiNextFunction<AddDocumentContentTemplateResponse, AddDocumentContentTemplateBody> = async ({ principal, body }) => {
  const newTemplateData: AddDocumentContentTemplateBody = body
  // TODO validate body

  // TODO authorization check if principal has access to create template

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date().toISOString()
  }

  const newDocument: NewDocumentContentTemplate = {
    name: newTemplateData.name,
    version: newTemplateData.version,
    availableForDocumentType: newTemplateData.availableForDocumentType,
    content: newTemplateData.content,
    created: editorData,
    modified: editorData
  }

  const dbClient = getDbClient()

  const templateId = await dbClient.createDocumentContentTemplate(newDocument)

  return {
    templateId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddDocumentContentTemplateResponse, AddDocumentContentTemplateBody>(requestEvent, addDocumentContentTemplate)
}
