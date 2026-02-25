import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type TemplatePageData = {
  template: DocumentContentTemplate
}

const getTemplate: ServerLoadNextFunction<TemplatePageData> = async ({ requestEvent }) => {
  // TODO validate admin access
  const templateId = requestEvent.params._id
  if (!templateId) {
    throw new HTTPError(400, "Missing template id")
  }

  if (templateId === "new") {
    const newTemplate: DocumentContentTemplate = {
      _id: "",
      version: 1,
      name: "",
      availableForDocumentType: {
        student: true,
        group: false
      },
      created: {
        at: new Date().toISOString(),
        by: {
          entraUserId: "nei",
          fallbackName: "nei"
        }
      },
      modified: {
        at: new Date().toISOString(),
        by: {
          entraUserId: "nei",
          fallbackName: "nei"
        }
      },
      content: []
    }
    return {
      data: {
        template: newTemplate
      },
      isAuthorized: true
    }
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
