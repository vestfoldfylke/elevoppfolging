import { getDbClient } from "$lib/server/db/get-db-client"
import { FormActionError } from "$lib/server/middleware/form-action-error"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverActionRequestMiddleware, serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate, EditorData, NewDocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerActionNextFunction, ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { Actions, PageServerLoad } from "./$types"

type TemplatePageData = {
  template: DocumentContentTemplate
}

const getTemplate: ServerLoadNextFunction<TemplatePageData> = async ({ requestEvent }) => {
  // TODO validate admin access
  const templateId = requestEvent.params._id
  if (!templateId) {
    throw new HTTPError(400, "Missing template id")
  }

  const dbClient: IDbClient = getDbClient()
  const template = await dbClient.getDocumentContentTemplateById(templateId)

  if (!template) {
    throw new HTTPError(404, "Template not found")
  }

  return {
    data: {
      template
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<TemplatePageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getTemplate)
}

type UpdatedTemplate = {
  templateId: string
}

type UpdateTemplateFailedData = {
  failedTemplate: DocumentContentTemplate
}

const updateDocumentContentTemplate: ServerActionNextFunction<UpdatedTemplate> = async ({ requestEvent, principal }) => {
  // TODO validate that user can create templates, right now any authenticated user can create templates

  // get form data fields and validate
  const formData = await requestEvent.request.formData()
  const templateData: string | null = formData.get("templateData")?.toString() || null

  if (!templateData) {
    throw new HTTPError(400, "Missing templateData in form data")
  }

  const updateDocumentContentTemplateData: DocumentContentTemplate = JSON.parse(templateData)

  const returnOnFail: UpdateTemplateFailedData = {
    failedTemplate: updateDocumentContentTemplateData
  }

  // TODO validate the entire template
  if (!updateDocumentContentTemplateData.name || typeof updateDocumentContentTemplateData.name !== "string") {
    throw new FormActionError(400, "documentTitle is required and must be a string.", returnOnFail)
  }

  const dbClient: IDbClient = getDbClient()

  const existingTemplate = await dbClient.getDocumentContentTemplateById(updateDocumentContentTemplateData._id)

  if (!existingTemplate) {
    throw new HTTPError(404, "Cannot update template, template not found")
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date().toISOString()
  }

  const updatedTemplate: NewDocumentContentTemplate = {
    name: updateDocumentContentTemplateData.name,
    availableForDocumentType: {
      student: updateDocumentContentTemplateData.availableForDocumentType.student,
      group: updateDocumentContentTemplateData.availableForDocumentType.group
    },
    version: existingTemplate.version + 1,
    created: existingTemplate.created,
    modified: editorData,
    content: updateDocumentContentTemplateData.content
  }

  try {
    const templateId = await dbClient.updateDocumentContentTemplate(updateDocumentContentTemplateData._id, updatedTemplate)
    return {
      data: {
        templateId
      },
      isAuthorized: true
    }
  } catch (error) {
    throw new FormActionError(500, "Error updating document template, try again", returnOnFail, error)
  }
}

const deleteDocumentContentTemplate: ServerActionNextFunction<{ deletedId: string }> = async ({ requestEvent }) => {
  const formData = await requestEvent.request.formData()
  const templateId: string | null = formData.get("templateId")?.toString() || null
  
  if (!templateId) {
    throw new HTTPError(400, "Missing template id")
  }

  // TODO validate that user can delete templates, right now any authenticated user can delete templates
  const dbClient: IDbClient = getDbClient()
  try {
    await dbClient.deleteDocumentContentTemplate(templateId)
    return {
      data: {
        deletedId: templateId
      },
      isAuthorized: true
    }
  } catch (_error) {
    throw new HTTPError(500, "Error deleting document template, try again")
  }
}

export const actions = {
  updateDocumentContentTemplateAction: async (event) => {
    return serverActionRequestMiddleware<UpdatedTemplate, UpdateTemplateFailedData>(event, updateDocumentContentTemplate)
  },
  deleteDocumentContentTemplateAction: async (event) => {
    return serverActionRequestMiddleware<{ deletedId: string }, object>(event, deleteDocumentContentTemplate)
  }
} satisfies Actions
