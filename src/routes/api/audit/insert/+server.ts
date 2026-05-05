import type { RequestHandler } from "@sveltejs/kit"
import { insertAuditEntry } from "$lib/server/audit/handle-audits"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { AuditEntryInput } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AuditEntryInputRequest = ApiRouteMap["/api/audit/insert"]["POST"]["req"]
type AuditEntryInputResponse = ApiRouteMap["/api/audit/insert"]["POST"]["res"]

const addAuditEntry: ApiNextFunction<AuditEntryInputResponse, AuditEntryInputRequest> = async ({ body, principal }) => {
  const auditEntry: AuditEntryInput = body.auditEntry

  if (!auditEntry.created) {
    auditEntry.created = {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    }
  }

  const inserted: boolean = await insertAuditEntry(auditEntry, body.errorMessage, body.errorMessageObject)

  return {
    inserted
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AuditEntryInputResponse, AuditEntryInputRequest>(requestEvent, addAuditEntry)
}
