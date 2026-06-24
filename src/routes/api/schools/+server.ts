import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateSchoolData } from "$lib/data-validation/school-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewSchool } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddSchoolResponse = ApiRouteMap["/api/schools"]["POST"]["res"]
type AddSchoolBody = ApiRouteMap["/api/schools"]["POST"]["req"]

const addSchool: ApiNextFunction<AddSchoolResponse, AddSchoolBody> = async ({ principal, body }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const newSchoolData: AddSchoolBody = body
  const validationResult = validateSchoolData(newSchoolData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid school data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()
  const allSchools = await dbClient.schools.getSchools()

  if (allSchools.some((school) => school.schoolNumber === newSchoolData.schoolNumber)) {
    throw new HTTPError(400, "Skole med samme skolenummer finnes allerede")
  }
  if (allSchools.some((school) => school.name.toLowerCase() === newSchoolData.name.toLowerCase())) {
    throw new HTTPError(400, "Skole med samme navn finnes allerede")
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newSchool: NewSchool = {
    name: newSchoolData.name,
    schoolNumber: newSchoolData.schoolNumber,
    source: "MANUAL",
    created: editorData,
    modified: editorData
  }

  let schoolId: string

  try {
    schoolId = await dbClient.schools.createSchool(newSchool)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved opprettelse av skole", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "School",
      resourceId: schoolId,
      resourceName: newSchool.name,
      metaData: {
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating SchoolId {SchoolId}", schoolId)
  }

  return {
    schoolId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddSchoolResponse, AddSchoolBody>(requestEvent, addSchool)
}
