import { APP_INFO } from "$lib/server/app-info"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

const onSystemPageLoad: ServerLoadNextFunction<Record<string, never>> = async ({ principal }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  return {}
}

export const load: PageServerLoad = async (requestEvent) => {
  return await serverLoadRequestMiddleware(requestEvent, onSystemPageLoad)
}
