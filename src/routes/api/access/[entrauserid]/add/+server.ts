import type { RequestHandler } from "@sveltejs/kit"
import { validateAccessEntry } from "$lib/data-validation/access-entry"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canGrantAndRemoveAccessForSchool, isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { NewAccess } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type GrantAccessResponse = ApiRouteMap[`/api/access/${string}/add`]["POST"]["res"]
type GrantAccessBody = ApiRouteMap[`/api/access/${string}/add`]["POST"]["req"]

const grantAccess: ApiNextFunction<GrantAccessResponse, GrantAccessBody> = async ({ principal, requestEvent, body }) => {
  const entraUserId = requestEvent.params.entrauserid
  if (!entraUserId || typeof entraUserId !== "string") {
    throw new HTTPError(400, "Entra user ID is missing in request parameters")
  }

  const validationResult = validateAccessEntry(body)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid access entry: ${validationResult.message}`)
  }

  const accessEntryToGrant = body

  if (
    accessEntryToGrant.type !== "MANUELL-SKOLELEDER-TILGANG" &&
    accessEntryToGrant.type !== "MANUELL-ELEV-TILGANG" &&
    accessEntryToGrant.type !== "MANUELL-KLASSE-TILGANG" &&
    accessEntryToGrant.type !== "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG"
  ) {
    throw new HTTPError(
      400,
      "Invalid access entry type. Only MANUELL-SKOLELEDER-TILGANG, MANUELL-ELEV-TILGANG, MANUELL-KLASSE-TILGANG and MANUELL-UNDERVISNINGSOMRÅDE-TILGANG are allowed to add manually."
    )
  }

  const dbClient = getDbClient()

  if (accessEntryToGrant.type === "MANUELL-SKOLELEDER-TILGANG") {
    if (!isSystemAdmin(principal, APP_INFO)) {
      throw new HTTPError(403, "Forbidden")
    }
  } else {
    // Get access for principal to check if they have access to grant access on their school
    const principalAccess = await dbClient.getPrincipalAccess(principal.id)
    if (!principalAccess) {
      throw new HTTPError(403, "Forbidden")
    }
    const canGrantAccess = canGrantAndRemoveAccessForSchool(accessEntryToGrant.schoolNumber, principalAccess)
    if (!canGrantAccess) {
      throw new HTTPError(403, "Forbidden")
    }
  }

  const existingAccess = await dbClient.getPrincipalAccess(entraUserId)

  if (!existingAccess) {
    // Then we create empty
    const appUser = await dbClient.getAppUser(entraUserId)
    if (!appUser) {
      throw new HTTPError(404, "User not found")
    }
    const newAccess: NewAccess = {
      entraUserId,
      name: appUser.entra.displayName,
      schools: [],
      programAreas: [],
      classes: [],
      contactTeacherGroups: [],
      teachingGroups: [],
      students: []
    }
    await dbClient.createAccess(newAccess)
  } else {
    // If the same access entry already exists, we should not add it again
    switch (accessEntryToGrant.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        if (existingAccess.schools.some((s) => s.schoolNumber === accessEntryToGrant.schoolNumber && s.type === "MANUELL-SKOLELEDER-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      case "MANUELL-ELEV-TILGANG":
        if (existingAccess.students.some((s) => s._id === accessEntryToGrant._id && s.schoolNumber === accessEntryToGrant.schoolNumber && s.type === "MANUELL-ELEV-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      case "MANUELL-KLASSE-TILGANG":
        if (existingAccess.classes.some((c) => c.systemId === accessEntryToGrant.systemId && c.schoolNumber === accessEntryToGrant.schoolNumber && c.type === "MANUELL-KLASSE-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
        if (existingAccess.programAreas.some((p) => p._id === accessEntryToGrant._id && p.schoolNumber === accessEntryToGrant.schoolNumber && p.type === "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
    }
  }

  // Then we can finally add the access entry
  const updatedAccessId = await dbClient.addAccessEntry(entraUserId, accessEntryToGrant)

  return {
    updatedAccessId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GrantAccessResponse, GrantAccessBody>(requestEvent, grantAccess)
}
