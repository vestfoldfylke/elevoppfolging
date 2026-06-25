import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateProgramAreaData } from "$lib/data-validation/program-area-validation"
import { resolvePrincipalAccess } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSchoolLeaderForSchool } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewProgramArea, School } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddProgramAreaResponse = ApiRouteMap["/api/programareas"]["POST"]["res"]
type AddProgramAreaBody = ApiRouteMap["/api/programareas"]["POST"]["req"]

const addProgramArea: ApiNextFunction<AddProgramAreaResponse, AddProgramAreaBody> = async ({ principal, body }) => {
  const principalAccess = await resolvePrincipalAccess(principal)

  const newProgramAreaData: AddProgramAreaBody = body
  const validationResult = validateProgramAreaData(newProgramAreaData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid program area data: ${validationResult.message}`)
  }

  const authorizationResult = authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber: newProgramAreaData.schoolNumber })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const dbClient = getDbClient()

  const school: School | null = await dbClient.schools.getSchool(newProgramAreaData.schoolNumber)
  if (!school) {
    throw new HTTPError(404, "Skole ikke funnet")
  }

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

  let programAreaId: string

  try {
    programAreaId = await dbClient.programAreas.createProgramArea(school.name, newProgramArea)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av gruppering av klasser", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "ProgramArea",
      resourceId: programAreaId,
      resourceName: newProgramArea.name,
      metaData: {
        parentResource: "School",
        parentResourceId: newProgramArea.schoolNumber,
        schoolId: newProgramArea.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating ProgramAreaId {ProgramAreaId}", programAreaId)
  }

  return {
    programAreaId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddProgramAreaResponse, AddProgramAreaBody>(requestEvent, addProgramArea)
}
