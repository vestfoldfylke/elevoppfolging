import type { RequestHandler } from "@sveltejs/kit"
import { validateProgramAreaData } from "$lib/data-validation/program-area-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, canGrantAndRemoveAccessForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { NewProgramArea } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type DeleteProgramAreaResponse = ApiRouteMap[`/api/programareas/${NoSlashString}`]["DELETE"]["res"]

const deleteProgramArea: ApiNextFunction<DeleteProgramAreaResponse> = async ({ principal, requestEvent }) => {
  const principalAccess = await getPrincipalAccess(principal.id)

  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration"))
  }

  const programAreaId = requestEvent.params.programarea_id
  if (!programAreaId) {
    throw new HTTPError(400, "Program area ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const programAreaToDelete = await dbClient.getProgramArea(programAreaId)
  if (!programAreaToDelete) {
    throw new HTTPError(404, "Program area not found. Cannot delete non-existing program area.")
  }

  if (!canGrantAndRemoveAccessForSchool(programAreaToDelete.schoolNumber, principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration for this school"))
  }

  await dbClient.deleteProgramArea(programAreaId)

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
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration"))
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

  const programAreaToUpdate = await dbClient.getProgramArea(programAreaId)
  if (!programAreaToUpdate) {
    throw new HTTPError(404, "Program area not found. Cannot update non-existing program area.")
  }

  if (!canGrantAndRemoveAccessForSchool(programAreaToUpdate.schoolNumber, principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration for this school"))
  }

  if (programAreaToUpdate.schoolNumber !== updatedProgramAreaData.schoolNumber) {
    throw new HTTPError(403, noAccessMessage("Not allowed to change school of program area"))
  }

  const updatedProgramArea: NewProgramArea = {
    name: updatedProgramAreaData.name,
    classes: updatedProgramAreaData.classes,
    schoolNumber: programAreaToUpdate.schoolNumber,
    modified: {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    },
    created: programAreaToUpdate.created,
    source: programAreaToUpdate.source
  }

  const updatedProgramAreaId = await dbClient.updateProgramArea(programAreaId, updatedProgramArea)

  return {
    updatedProgramAreaId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateProgramAreaResponse, UpdateProgramAreaBody>(requestEvent, updateProgramArea)
}
