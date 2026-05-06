import type { RequestHandler } from "@sveltejs/kit"
import { insertAuditEntry } from "$lib/server/audit/handle-audits"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { AuditEntryInput } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AuditEntryInputRequest = ApiRouteMap["/api/audit/insert"]["POST"]["req"]
type AuditEntryInputResponse = ApiRouteMap["/api/audit/insert"]["POST"]["res"]

const addAuditEntry: ApiNextFunction<AuditEntryInputResponse, AuditEntryInputRequest> = async ({ body }) => {
  const auditEntry: AuditEntryInput = body.auditEntry

  // NOTE: We need to reset auditEntry.created.at to a Date object since the client will send it as a string and we need it to be a Date object for our database operations
  auditEntry.created.at = new Date(auditEntry.created.at)

  const inserted: boolean = await insertAuditEntry(auditEntry, body.errorMessage, body.errorMessageObject)

  return {
    inserted
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AuditEntryInputResponse, AuditEntryInputRequest>(requestEvent, addAuditEntry)
}
