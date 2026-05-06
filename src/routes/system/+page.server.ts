import { APP_INFO } from "$lib/server/app-info"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

const onSystemPageLoad: ServerLoadNextFunction<Record<string, never>> = async ({ principal }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, noAccessMessage("No permission to access system page"))
  }

  return {
    data: {},
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent) => {
  return await serverLoadRequestMiddleware(requestEvent, onSystemPageLoad)
}
