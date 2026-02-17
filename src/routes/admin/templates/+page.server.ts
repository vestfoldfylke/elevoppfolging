import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

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
