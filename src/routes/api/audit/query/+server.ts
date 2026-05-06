import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { queryAuditEntries } from "$lib/server/audit/handle-audits"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AuditEntryQueryRequest = ApiRouteMap["/api/audit/query"]["POST"]["req"]
type AuditEntryQueryResponse = ApiRouteMap["/api/audit/query"]["POST"]["res"]

const getAuditEntries: ApiNextFunction<AuditEntryQueryResponse, AuditEntryQueryRequest> = async ({ body }) => {
  try {
    return {
      entries: await queryAuditEntries(body)
    }
  } catch (error) {
    logger.errorException(error, "Failed to query audit entries with AuditSearchTerms: {@AuditSearchTerms}", body)

    return {
      errorMessage: `Feilet ved søk i audit logs: ${(error as Error).message}`,
      entries: []
    }
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AuditEntryQueryResponse, AuditEntryQueryRequest>(requestEvent, getAuditEntries)
}
