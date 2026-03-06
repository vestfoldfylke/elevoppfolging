import type { RequestHandler } from "@sveltejs/kit"
import { validateSchoolData } from "$lib/data-validation/school"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { NewSchool } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type DeleteSchoolResponse = ApiRouteMap[`/api/schools/${string}`]["DELETE"]["res"]

const deleteSchool: ApiNextFunction<DeleteSchoolResponse> = async ({ principal, requestEvent }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber || typeof schoolNumber !== "string") {
    throw new HTTPError(400, "School number is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingSchools = await dbClient.getSchools()
  const schoolToDelete = existingSchools.find((school) => school.schoolNumber === schoolNumber)
  if (!schoolToDelete) {
    throw new HTTPError(404, "School not found. Cannot delete non-existing school.")
  }
  if (schoolToDelete.source !== "MANUAL") {
    throw new HTTPError(400, "Only schools created manually can be deleted.")
  }

  await dbClient.deleteSchool(schoolNumber)

  return {
    deletedSchoolNumber: schoolNumber
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteSchoolResponse>(requestEvent, deleteSchool)
}

type UpdateSchoolResponse = ApiRouteMap[`/api/schools/${string}`]["PUT"]["res"]
type UpdateSchoolBody = ApiRouteMap[`/api/schools/${string}`]["PUT"]["req"]

const updateSchool: ApiNextFunction<UpdateSchoolResponse, UpdateSchoolBody> = async ({ principal, requestEvent, body }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber || typeof schoolNumber !== "string") {
    throw new HTTPError(400, "School number is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingSchools = await dbClient.getSchools()
  const schoolToUpdate = existingSchools.find((school) => school.schoolNumber === schoolNumber)
  if (!schoolToUpdate) {
    throw new HTTPError(404, "School not found. Cannot update non-existing school.")
  }
  if (schoolToUpdate.source !== "MANUAL") {
    throw new HTTPError(400, "Only schools created manually can be updated.")
  }

  const updatedSchoolData: UpdateSchoolBody = body
  const validationResult = validateSchoolData(updatedSchoolData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid school data: ${validationResult.message}`)
  }

  if (updatedSchoolData.schoolNumber !== schoolNumber || updatedSchoolData.schoolNumber !== schoolToUpdate.schoolNumber) {
    throw new HTTPError(400, "You cannot change the school number of an existing school.")
  }

  const updatedSchool: NewSchool = {
    name: updatedSchoolData.name,
    schoolNumber: schoolToUpdate.schoolNumber, // keep the original school number to prevent changes to it
    source: "MANUAL",
    created: schoolToUpdate.created,
    modified: {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    }
  }

  const updatedSchoolId = await dbClient.updateSchool(schoolNumber, updatedSchool)

  return {
    updatedSchoolId
  }
}

export const PUT: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateSchoolResponse, UpdateSchoolBody>(requestEvent, updateSchool)
}
