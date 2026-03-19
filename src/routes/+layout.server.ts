import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { RootLayoutData } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

const layoutLoad: ServerLoadNextFunction<RootLayoutData> = async ({ principal }) => {
  const dbClient = getDbClient()

  const principalAccess: Access | null = await dbClient.getPrincipalAccess(principal.id)

  // Todo filter out access entries that are not connected to active elements

  return {
    data: {
      authenticatedPrincipal: principal,
      APP_INFO,
      principalAccess
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<RootLayoutData> => {
  return serverLoadRequestMiddleware(requestEvent, layoutLoad)
}
