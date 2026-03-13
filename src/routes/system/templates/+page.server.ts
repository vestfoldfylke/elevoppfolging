import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type TemplatePageData = {
  templates: DocumentContentTemplate[]
}

const getTemplates: ServerLoadNextFunction<TemplatePageData> = async ({ principal }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Access denied.")
  }

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
