import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type LayoutLoadData = {
  authenticatedPrincipal: AuthenticatedPrincipal
}

const layoutLoad: ServerLoadNextFunction<LayoutLoadData> = async ({ principal }) => {
  return {
    data: {
      authenticatedPrincipal: principal
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<LayoutLoadData> => {
  return serverLoadRequestMiddleware(requestEvent, layoutLoad)
}
