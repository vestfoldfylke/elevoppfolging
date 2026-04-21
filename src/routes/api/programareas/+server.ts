import type { RequestHandler } from "@sveltejs/kit"
import { validateProgramAreaData } from "$lib/data-validation/program-area-validation"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, canGrantAndRemoveAccessForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewProgramArea } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { invalidateProgramAreaCache } from "$lib/server/cache/program-area-cache"

type AddProgramAreaResponse = ApiRouteMap["/api/programareas"]["POST"]["res"]
type AddProgramAreaBody = ApiRouteMap["/api/programareas"]["POST"]["req"]

const addProgramArea: ApiNextFunction<AddProgramAreaResponse, AddProgramAreaBody> = async ({ principal, body }) => {
  const principalAccess = await getPrincipalAccess(principal.id)

  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration"))
  }

  const newProgramAreaData: AddProgramAreaBody = body
  const validationResult = validateProgramAreaData(newProgramAreaData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid program area data: ${validationResult.message}`)
  }

  if (!canGrantAndRemoveAccessForSchool(newProgramAreaData.schoolNumber, principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No access to school administration for this school"))
  }

  const dbClient = getDbClient()

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newProgramArea: NewProgramArea = {
    classes: newProgramAreaData.classes,
    name: newProgramAreaData.name,
    schoolNumber: newProgramAreaData.schoolNumber,
    created: editorData,
    modified: editorData,
    source: "MANUAL"
  }

  const programAreaId = await dbClient.createProgramArea(newProgramArea)

  return {
    programAreaId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddProgramAreaResponse, AddProgramAreaBody>(requestEvent, addProgramArea)
}
