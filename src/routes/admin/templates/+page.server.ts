import { getDbClient } from "$lib/server/db/get-db-client"
import { FormActionError } from "$lib/server/middleware/form-action-error"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverActionRequestMiddleware, serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate, EditorData, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerActionNextFunction, ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { Actions, PageServerLoad } from "./$types"

type TemplatePageData = {
  templates: DocumentContentTemplate[]
}

const getTemplates: ServerLoadNextFunction<TemplatePageData> = async () => {
  // TODO validate admin access

  const dbClient: IDbClient = getDbClient()
  const templates = await dbClient.getDocumentContentTemplates()

  return {
    data: {
      templates
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<TemplatePageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getTemplates)
}

type CreatedTemplate = {
  templateId: string
}

type CreateTemplateFailedData = {
  failedTemplate: DocumentContentTemplate
}

const newDocumentContentTemplate: ServerActionNextFunction<CreatedTemplate> = async ({ requestEvent, principal }) => {
  // TODO validate that user can create templates, right now any authenticated user can create templates

  // get form data fields and validate
  const formData = await requestEvent.request.formData()
  const templateData: string | null = formData.get("templateData")?.toString() || null

  if (!templateData) {
    throw new HTTPError(400, "Missing templateData in form data")
  }

  const newDocumentContentTemplateData: DocumentContentTemplate = JSON.parse(templateData)

  const returnOnFail: CreateTemplateFailedData = {
    failedTemplate: newDocumentContentTemplateData
  }

  // TODO validate the entire template
  if (!newDocumentContentTemplateData.name || typeof newDocumentContentTemplateData.name !== "string") {
    throw new FormActionError(400, "documentTitle is required and must be a string.", returnOnFail)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date().toISOString()
  }

  const newDocument: NewDocumentContentTemplate = {
    name: newDocumentContentTemplateData.name,
    availableForDocumentType: {
      student: newDocumentContentTemplateData.availableForDocumentType.student,
      group: newDocumentContentTemplateData.availableForDocumentType.group
    },
    version: 1,
    created: editorData,
    modified: editorData,
    content: newDocumentContentTemplateData.content
  }

  const dbClient: IDbClient = getDbClient()
  try {
    const templateId = await dbClient.createDocumentContentTemplate(newDocument)
    return {
      data: {
        templateId
      },
      isAuthorized: true
    }
  } catch (error) {
    throw new FormActionError(500, "Error creating student document, try again", returnOnFail, error)
  }
}

export const actions = {
  newDocumentContentTemplateAction: async (event) => {
    return serverActionRequestMiddleware<CreatedTemplate, CreateTemplateFailedData>(event, newDocumentContentTemplate)
  }
} satisfies Actions
