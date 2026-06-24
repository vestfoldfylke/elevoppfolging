import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type TemplatePageData = {
  template: DocumentContentTemplate
}

const getTemplate: ServerLoadNextFunction<TemplatePageData> = async ({ principal, requestEvent }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const templateId = requestEvent.params.template_id
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
        at: new Date(),
        by: {
          entraUserId: "nei",
          fallbackName: "nei"
        }
      },
      modified: {
        at: new Date(),
        by: {
          entraUserId: "nei",
          fallbackName: "nei"
        }
      },
      content: [],
      sort: 20
    }

    return {
      template: newTemplate
    }
  }

  const dbClient: IDbClient = getDbClient()
  const template = await dbClient.documentContentTemplates.getDocumentContentTemplateById(templateId)

  if (!template) {
    throw new HTTPError(404, "Mal ikke funnet")
  }

  return {
    template
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<TemplatePageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getTemplate)
}
