import type { RequestEvent } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { register } from "@vestfoldfylke/vestfold-metrics"
import { APP_INFO } from "$lib/server/app-info"
import { getAuthenticatedPrincipal } from "$lib/server/authentication/get-authenticated-principal"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"

export const GET = async ({ request }: RequestEvent) => {
  const principalClaims: AuthenticatedPrincipal = getAuthenticatedPrincipal(request.headers)
  if (!principalClaims.roles.includes(APP_INFO.ROLES.METRICS)) {
    logger.error("Authenticated principal with object ID {ObjectId} does not have Metrics role. Principal: {@Principal}", principalClaims.id, principalClaims)
    return new Response("Forbidden", { status: 403 })
  }

  return new Response(await register.metrics(), {
    headers: { "Content-Type": "text/plain" }
  })
}
