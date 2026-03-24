import type { RequestHandler } from "@sveltejs/kit"
import { validateAccessEntryInput } from "$lib/data-validation/access-entry-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canGrantAndRemoveAccessForSchool, isSystemAdmin, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { AccessEntry, PrincipalAccessStudent } from "$lib/types/app-types"
import type { ClassGroup, NewAccess } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { getClassesFromStudents } from "$lib/utils/classes-from-students"

type GrantAccessResponse = ApiRouteMap[`/api/access/${NoSlashString}/add`]["POST"]["res"]
type GrantAccessBody = ApiRouteMap[`/api/access/${NoSlashString}/add`]["POST"]["req"]

const grantAccess: ApiNextFunction<GrantAccessResponse, GrantAccessBody> = async ({ principal, requestEvent, body }) => {
  const entraUserId = requestEvent.params.entrauserid
  if (!entraUserId || typeof entraUserId !== "string") {
    throw new HTTPError(400, "Entra user ID is missing in request parameters")
  }

  const validationResult = validateAccessEntryInput(body)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid access entry: ${validationResult.message}`)
  }

  const accessEntryInput = body

  const dbClient = getDbClient()

  if (accessEntryInput.type === "MANUELL-SKOLELEDER-TILGANG") {
    if (!isSystemAdmin(principal, APP_INFO)) {
      throw new HTTPError(403, noAccessMessage("No permission to grant access"))
    }
  } else {
    // Get access for principal to check if they have access to grant access on their school
    const principalAccess = await dbClient.getPrincipalAccess(principal.id)
    if (!principalAccess) {
      throw new HTTPError(403, noAccessMessage("No access found for principal"))
    }
    const canGrantAccess = canGrantAndRemoveAccessForSchool(accessEntryInput.schoolNumber, principalAccess)
    if (!canGrantAccess) {
      throw new HTTPError(403, noAccessMessage("No permission to handle access for this school"))
    }

    const principalAccessStudents: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)
    const principalClasses: (ClassGroup & { schoolNumber: string })[] = getClassesFromStudents(principalAccessStudents)

    // Check also that the principal has access to the specific program area, class or student if the access entry is for those types
    switch (accessEntryInput.type) {
      case "MANUELL-ELEV-TILGANG": {
        if (
          !principalAccessStudents.some(
            (student) => student._id === accessEntryInput._id && student.accessTypes.some((a) => a.type === "MANUELL-SKOLELEDER-TILGANG" && a.schoolNumber === accessEntryInput.schoolNumber)
          )
        ) {
          throw new HTTPError(403, noAccessMessage("No permission to grant access to this student"))
        }
        break
      }
      case "MANUELL-KLASSE-TILGANG": {
        if (!principalClasses.some((c) => c.systemId === accessEntryInput.systemId && c.schoolNumber === accessEntryInput.schoolNumber)) {
          throw new HTTPError(403, noAccessMessage("No permission to grant grant access to this class"))
        }
        break
      }
      default:
        throw new Error("PROGRAM-OMRÅDE-TILGANG IKKE IMPLEMENTERT ENDA")
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
    switch (accessEntryInput.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        if (existingAccess.schools.some((s) => s.schoolNumber === accessEntryInput.schoolNumber && s.type === "MANUELL-SKOLELEDER-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }

        break
      case "MANUELL-ELEV-TILGANG":
        if (existingAccess.students.some((s) => s._id === accessEntryInput._id && s.schoolNumber === accessEntryInput.schoolNumber && s.type === "MANUELL-ELEV-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      case "MANUELL-KLASSE-TILGANG":
        if (existingAccess.classes.some((c) => c.systemId === accessEntryInput.systemId && c.schoolNumber === accessEntryInput.schoolNumber && c.type === "MANUELL-KLASSE-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      /* TODO uncomment when we implement program area access
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
        if (existingAccess.programAreas.some((p) => p._id === accessEntryInput._id && p.schoolNumber === accessEntryInput.schoolNumber && p.type === "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG")) {
          throw new HTTPError(400, "Access entry already exists")
        }
        break
      */
    }
  }

  const accessEntryToAdd: AccessEntry = {
    ...accessEntryInput,
    granted: {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    },
    source: "MANUAL"
  }

  // Then we can finally add the access entry
  const updatedAccessId = await dbClient.addAccessEntry(entraUserId, accessEntryToAdd)

  return {
    updatedAccessId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GrantAccessResponse, GrantAccessBody>(requestEvent, grantAccess)
}
