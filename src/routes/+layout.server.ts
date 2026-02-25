import { APP_INFO } from "$lib/server/app-info"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { RootLayoutData } from "$lib/types/app-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

const layoutLoad: ServerLoadNextFunction<RootLayoutData> = async ({ principal }) => {
  return {
    data: {
      authenticatedPrincipal: principal,
      APP_INFO
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<RootLayoutData> => {
  return serverLoadRequestMiddleware(requestEvent, layoutLoad)
}
