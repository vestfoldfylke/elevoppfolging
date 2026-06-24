import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateAccessEntryInput } from "$lib/data-validation/access-entry-validation"
import { APP_INFO } from "$lib/server/app-info"
import { invalidateStudentAccessCache } from "$lib/server/cache/student-access-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canGrantAndRemoveAccessForSchool, isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { School } from "$lib/types/db/shared-types"
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
      throw new HTTPError(403, noAccessMessage("Ikke tillatelse til fjerne skoleleder tilgang"))
    }
  } else {
    // Get access for principal to check if they have access to grant access on their school
    const principalAccess = await dbClient.access.getPrincipalAccess(principal.id)
    if (!principalAccess) {
      throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
    }
    const canGrantAccess = canGrantAndRemoveAccessForSchool(accessEntryToRemove.schoolNumber, principalAccess)
    if (!canGrantAccess) {
      throw new HTTPError(403, noAccessMessage("Ikke tillatelse til fjerne tilgang"))
    }
  }

  const school: School | null = await dbClient.schools.getSchool(accessEntryToRemove.schoolNumber)
  if (!school) {
    throw new HTTPError(404, noAccessMessage("Skole ikke funnet"))
  }

  const existingAccess = await dbClient.access.getPrincipalAccess(entraUserId)

  if (!existingAccess) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
  }

  // If the same access entry does not exist, we should not remove it
  switch (accessEntryToRemove.type) {
    case "MANUELL-SKOLELEDER-TILGANG":
      if (!existingAccess.leaderForSchools.some((s) => s.schoolNumber === accessEntryToRemove.schoolNumber && s.type === "MANUELL-SKOLELEDER-TILGANG")) {
        throw new HTTPError(400, "Kan ikke fjerne tilgangsoppføring som ikke finnes")
      }
      break
    case "MANUELL-ALLE-ELEVER-VED-SKOLE-TILGANG":
      if (!existingAccess.allStudentsAtSchools.some((s) => s.schoolNumber === accessEntryToRemove.schoolNumber && s.type === "MANUELL-ALLE-ELEVER-VED-SKOLE-TILGANG")) {
        throw new HTTPError(400, "Kan ikke fjerne tilgangsoppføring som ikke finnes")
      }
      break
    case "MANUELL-ELEV-TILGANG":
      if (!existingAccess.students.some((s) => s._id === accessEntryToRemove._id && s.schoolNumber === accessEntryToRemove.schoolNumber && s.type === "MANUELL-ELEV-TILGANG")) {
        throw new HTTPError(400, "Kan ikke fjerne tilgangsoppføring som ikke finnes")
      }
      break
    case "MANUELL-KLASSE-TILGANG":
      if (!existingAccess.classes.some((c) => c.systemId === accessEntryToRemove.systemId && c.schoolNumber === accessEntryToRemove.schoolNumber && c.type === "MANUELL-KLASSE-TILGANG")) {
        throw new HTTPError(400, "Kan ikke fjerne tilgangsoppføring som ikke finnes")
      }
      break
    case "MANUELL-PROGRAMOMRÅDE-TILGANG":
      if (!existingAccess.programAreas.some((p) => p._id === accessEntryToRemove._id && p.schoolNumber === accessEntryToRemove.schoolNumber && p.type === "MANUELL-PROGRAMOMRÅDE-TILGANG")) {
        throw new HTTPError(400, "Kan ikke fjerne tilgangsoppføring som ikke finnes")
      }
      break
  }

  // Then we can finally remove the access entry
  let updatedAccessId: string

  try {
    updatedAccessId = await dbClient.access.removeAccessEntry(entraUserId, school.name, accessEntryToRemove)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved fjerning av tilgang", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      },
      action: "DELETE",
      resource: "Access",
      resourceId: updatedAccessId,
      resourceName: accessEntryToRemove.type,
      metaData: {
        data: JSON.stringify(accessEntryToRemove),
        parentResource: "School",
        parentResourceId: accessEntryToRemove.schoolNumber,
        schoolId: accessEntryToRemove.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing access {@AccessEntry}", accessEntryToRemove)
  }

  // Invalidate cache
  invalidateStudentAccessCache()

  return {
    updatedAccessId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<RemoveAccessResponse, RemoveAccessBody>(requestEvent, removeAccess)
}
