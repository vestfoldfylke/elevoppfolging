import type { RequestHandler } from "@sveltejs/kit"
import { validateSchoolData } from "$lib/data-validation/school"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewSchool } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddSchoolResponse = ApiRouteMap["/api/schools"]["POST"]["res"]
type AddSchoolBody = ApiRouteMap["/api/schools"]["POST"]["req"]

const addSchool: ApiNextFunction<AddSchoolResponse, AddSchoolBody> = async ({ principal, body }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const newSchoolData: AddSchoolBody = body
  const validationResult = validateSchoolData(newSchoolData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid school data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()
  const allSchools = await dbClient.getSchools()

  if (allSchools.some((school) => school.schoolNumber === newSchoolData.schoolNumber)) {
    throw new HTTPError(400, "A school with the same school number already exists.")
  }
  if (allSchools.some((school) => school.name.toLowerCase() === newSchoolData.name.toLowerCase())) {
    throw new HTTPError(400, "A school with the same name already exists.")
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

  const schoolId = await dbClient.createSchool(newSchool)

  return {
    schoolId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddSchoolResponse, AddSchoolBody>(requestEvent, addSchool)
}
