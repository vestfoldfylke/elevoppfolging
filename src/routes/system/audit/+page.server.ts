import { APP_INFO } from "$lib/server/app-info"
import { queryAuditEntries } from "$lib/server/audit/handle-audits"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { AuditEntry } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type AuditPageData = {
  audits: AuditEntry[]
}

const getAudits: ServerLoadNextFunction<AuditPageData> = async ({ principal }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const audits: AuditEntry[] = await queryAuditEntries()

  return {
    audits
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<AuditPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAudits)
}
