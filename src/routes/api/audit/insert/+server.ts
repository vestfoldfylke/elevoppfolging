import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { insertAuditEntry } from "$lib/server/audit/handle-audits"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AuditEntryInputRequest = ApiRouteMap["/api/audit/insert"]["POST"]["req"]
type AuditEntryInputResponse = ApiRouteMap["/api/audit/insert"]["POST"]["res"]

const addAuditEntry: ApiNextFunction<AuditEntryInputResponse, AuditEntryInputRequest> = async ({ body, principal }) => {
  try {
    if (!body.created) {
      body.created = {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      }
    }

    await insertAuditEntry(body)

    return {
      inserted: true
    }
  } catch (error) {
    logger.errorException(error, "Failed to insert audit entry with AuditEntryInput: {@AuditEntryInput}", body)

    return {
      inserted: false
    }
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AuditEntryInputResponse, AuditEntryInputRequest>(requestEvent, addAuditEntry)
}
