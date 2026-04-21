import type { RequestHandler } from "@sveltejs/kit"
import { validateAccessEntryInput } from "$lib/data-validation/access-entry-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canGrantAndRemoveAccessForSchool, isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type RemoveAccessResponse = ApiRouteMap[`/api/access/${NoSlashString}/remove`]["POST"]["res"]
type RemoveAccessBody = ApiRouteMap[`/api/access/${NoSlashString}/remove`]["POST"]["req"]

const removeAccess: ApiNextFunction<RemoveAccessResponse, RemoveAccessBody> = async ({ principal, requestEvent, body }) => {
  const entraUserId = requestEvent.params.entrauserid
  if (!entraUserId || typeof entraUserId !== "string") {
    throw new HTTPError(400, "Entra user ID is missing in request parameters")
  }

  const validationResult = validateAccessEntryInput(body)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid access entry: ${validationResult.message}`)
  }

  const accessEntryToRemove = body

  const dbClient = getDbClient()

  if (accessEntryToRemove.type === "MANUELL-SKOLELEDER-TILGANG") {
    if (!isSystemAdmin(principal, APP_INFO)) {
      throw new HTTPError(403, noAccessMessage("No permission to remove access"))
    }
  } else {
    // Get access for principal to check if they have access to grant access on their school
    const principalAccess = await dbClient.getPrincipalAccess(principal.id)
    if (!principalAccess) {
      throw new HTTPError(403, noAccessMessage("No access found for principal"))
    }
    const canGrantAccess = canGrantAndRemoveAccessForSchool(accessEntryToRemove.schoolNumber, principalAccess)
    if (!canGrantAccess) {
      throw new HTTPError(403, noAccessMessage("No permission to remove access"))
    }
  }

  const existingAccess = await dbClient.getPrincipalAccess(entraUserId)

  if (!existingAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  // If the same access entry does not exist, we should not remove it
  switch (accessEntryToRemove.type) {
    case "MANUELL-SKOLELEDER-TILGANG":
      if (!existingAccess.leaderForSchools.some((s) => s.schoolNumber === accessEntryToRemove.schoolNumber && s.type === "MANUELL-SKOLELEDER-TILGANG")) {
        throw new HTTPError(400, "Cannot remove access entry that does not exist")
      }
      break
    case "MANUELL-ELEV-TILGANG":
      if (!existingAccess.students.some((s) => s._id === accessEntryToRemove._id && s.schoolNumber === accessEntryToRemove.schoolNumber && s.type === "MANUELL-ELEV-TILGANG")) {
        throw new HTTPError(400, "Cannot remove access entry that does not exist")
      }
      break
    case "MANUELL-KLASSE-TILGANG":
      if (!existingAccess.classes.some((c) => c.systemId === accessEntryToRemove.systemId && c.schoolNumber === accessEntryToRemove.schoolNumber && c.type === "MANUELL-KLASSE-TILGANG")) {
        throw new HTTPError(400, "Cannot remove access entry that does not exist")
      }
      break
    case "MANUELL-PROGRAMOMRÅDE-TILGANG":
      if (!existingAccess.programAreas.some((p) => p._id === accessEntryToRemove._id && p.schoolNumber === accessEntryToRemove.schoolNumber && p.type === "MANUELL-PROGRAMOMRÅDE-TILGANG")) {
        throw new HTTPError(400, "Cannot remove access entry that does not exist")
      }
      break
  }

  // Then we can finally remove the access entry
  const updatedAccessId = await dbClient.removeAccessEntry(entraUserId, accessEntryToRemove)

  return {
    updatedAccessId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<RemoveAccessResponse, RemoveAccessBody>(requestEvent, removeAccess)
}
