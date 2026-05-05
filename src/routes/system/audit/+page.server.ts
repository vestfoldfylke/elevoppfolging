import { APP_INFO } from "$lib/server/app-info"
import { queryAuditEntries } from "$lib/server/audit/handle-audits"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { AuditEntry } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type AuditPageData = {
  audits: AuditEntry[]
}

const getAudits: ServerLoadNextFunction<AuditPageData> = async ({ principal }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, noAccessMessage("No permission to view audit logs"))
  }

  const audits: AuditEntry[] = await queryAuditEntries()

  return {
    data: {
      audits
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<AuditPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAudits)
}
