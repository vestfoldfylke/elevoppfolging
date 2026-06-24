import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateProgramAreaData } from "$lib/data-validation/program-area-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { invalidateProgramAreaCache } from "$lib/server/cache/program-area-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, canGrantAndRemoveAccessForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, NewProgramArea, School } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type DeleteProgramAreaResponse = ApiRouteMap[`/api/programareas/${NoSlashString}`]["DELETE"]["res"]

const deleteProgramArea: ApiNextFunction<DeleteProgramAreaResponse> = async ({ principal, requestEvent }) => {
  const principalAccess = await getPrincipalAccess(principal.id)

  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til skoleadministrasjon"))
  }

  const programAreaId = requestEvent.params.programarea_id
  if (!programAreaId) {
    throw new HTTPError(400, "Program area ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const programAreaToDelete = await dbClient.programAreas.getProgramArea(programAreaId)
  if (!programAreaToDelete) {
    throw new HTTPError(404, "Gruppering av klasser ikke funnet")
  }

  if (!canGrantAndRemoveAccessForSchool(programAreaToDelete.schoolNumber, principalAccess)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til skoleadministrasjon"))
  }

  const school: School | null = await dbClient.schools.getSchool(programAreaToDelete.schoolNumber)
  if (!school) {
    throw new HTTPError(404, noAccessMessage("Skole ikke funnet"))
  }

  try {
    await dbClient.programAreas.deleteProgramArea(school.name, programAreaToDelete)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved sletting av gruppering av klasser", error)
  }

  // Invalidate cache entry
  invalidateProgramAreaCache(programAreaId)

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
      resource: "ProgramArea",
      resourceId: programAreaId,
      resourceName: programAreaToDelete.name,
      metaData: {
        parentResource: "School",
        parentResourceId: programAreaToDelete.schoolNumber,
        schoolId: programAreaToDelete.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing ProgramAreaId {ProgramAreaId}", programAreaId)
  }

  return {
    deletedProgramAreaId: programAreaId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteProgramAreaResponse>(requestEvent, deleteProgramArea)
}

type UpdateProgramAreaResponse = ApiRouteMap[`/api/programareas/${NoSlashString}`]["PATCH"]["res"]
type UpdateProgramAreaBody = ApiRouteMap[`/api/programareas/${NoSlashString}`]["PATCH"]["req"]

const updateProgramArea: ApiNextFunction<UpdateProgramAreaResponse, UpdateProgramAreaBody> = async ({ principal, requestEvent, body }) => {
  const principalAccess = await getPrincipalAccess(principal.id)

  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang funnet for bruker"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til skoleadministrasjon"))
  }

  const programAreaId = requestEvent.params.programarea_id

  if (!programAreaId) {
    throw new HTTPError(400, "Program area ID is missing in request parameters")
  }

  const updatedProgramAreaData: UpdateProgramAreaBody = body
  const validationResult = validateProgramAreaData(updatedProgramAreaData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid program area data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()

  const programAreaToUpdate = await dbClient.programAreas.getProgramArea(programAreaId)
  if (!programAreaToUpdate) {
    throw new HTTPError(404, "Gruppering av klasser ikke funnet")
  }

  if (!canGrantAndRemoveAccessForSchool(programAreaToUpdate.schoolNumber, principalAccess)) {
    throw new HTTPError(403, noAccessMessage("Ingen tilgang til skoleadministrasjon"))
  }

  if (programAreaToUpdate.schoolNumber !== updatedProgramAreaData.schoolNumber) {
    throw new HTTPError(403, noAccessMessage("Ikke tillatt å endre skole for grupperingen av klasser"))
  }

  const school: School | null = await dbClient.schools.getSchool(updatedProgramAreaData.schoolNumber)
  if (!school) {
    throw new HTTPError(404, noAccessMessage("Skole ikke funnet"))
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updatedProgramArea: NewProgramArea = {
    name: updatedProgramAreaData.name,
    classes: updatedProgramAreaData.classes,
    schoolNumber: programAreaToUpdate.schoolNumber,
    modified: editorData,
    created: programAreaToUpdate.created,
    source: programAreaToUpdate.source
  }

  let updatedProgramAreaId: string

  try {
    updatedProgramAreaId = await dbClient.programAreas.updateProgramArea(programAreaId, school.name, updatedProgramArea)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av gruppering av klasser", error)
  }

  // Invalidate cache entry
  invalidateProgramAreaCache(programAreaId)

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "ProgramArea",
      resourceId: updatedProgramAreaId,
      resourceName: updatedProgramArea.name,
      metaData: {
        parentResource: "School",
        parentResourceId: updatedProgramArea.schoolNumber,
        schoolId: updatedProgramArea.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating ProgramAreaId {ProgramAreaId}", updatedProgramAreaId)
  }

  return {
    updatedProgramAreaId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateProgramAreaResponse, UpdateProgramAreaBody>(requestEvent, updateProgramArea)
}
