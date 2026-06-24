import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateSchoolData } from "$lib/data-validation/school-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, NewSchool } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type DeleteSchoolResponse = ApiRouteMap[`/api/schools/${NoSlashString}`]["DELETE"]["res"]

const deleteSchool: ApiNextFunction<DeleteSchoolResponse> = async ({ principal, requestEvent }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber || typeof schoolNumber !== "string") {
    throw new HTTPError(400, "School number is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingSchools = await dbClient.schools.getSchools()
  const schoolToDelete = existingSchools.find((school) => school.schoolNumber === schoolNumber)
  if (!schoolToDelete) {
    throw new HTTPError(404, "Skole ikke funnet")
  }
  if (schoolToDelete.source !== "MANUAL") {
    throw new HTTPError(400, "Kan ikke slette skole som kommer fra kildesystemet. KUN manuelle skoler kan slettes")
  }

  try {
    await dbClient.schools.deleteSchool(schoolNumber)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved sletting av skole", error)
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
      resource: "School",
      resourceId: schoolToDelete._id,
      resourceName: schoolToDelete.name,
      metaData: {
        data: JSON.stringify({
          schoolNumber: schoolToDelete.schoolNumber,
          source: schoolToDelete.source
        }),
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing SchoolId {SchoolId}", schoolNumber)
  }

  return {
    deletedSchoolNumber: schoolNumber
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteSchoolResponse>(requestEvent, deleteSchool)
}

type UpdateSchoolResponse = ApiRouteMap[`/api/schools/${NoSlashString}`]["PUT"]["res"]
type UpdateSchoolBody = ApiRouteMap[`/api/schools/${NoSlashString}`]["PUT"]["req"]

const updateSchool: ApiNextFunction<UpdateSchoolResponse, UpdateSchoolBody> = async ({ principal, requestEvent, body }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber || typeof schoolNumber !== "string") {
    throw new HTTPError(400, "School number is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingSchools = await dbClient.schools.getSchools()
  const schoolToUpdate = existingSchools.find((school) => school.schoolNumber === schoolNumber)
  if (!schoolToUpdate) {
    throw new HTTPError(404, "Skole ikke funnet")
  }
  if (schoolToUpdate.source !== "MANUAL") {
    throw new HTTPError(400, "Kan ikke oppdatere skole som kommer fra kildesystemet. KUN manuelle skoler kan oppdateres")
  }

  const updatedSchoolData: UpdateSchoolBody = body
  const validationResult = validateSchoolData(updatedSchoolData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid school data: ${validationResult.message}`)
  }

  if (updatedSchoolData.schoolNumber !== schoolNumber || updatedSchoolData.schoolNumber !== schoolToUpdate.schoolNumber) {
    throw new HTTPError(400, "Skolenummer kan ikke endres på en eksisterende skole")
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updatedSchool: NewSchool = {
    name: updatedSchoolData.name,
    schoolNumber: schoolToUpdate.schoolNumber, // keep the original school number to prevent changes to it
    source: schoolToUpdate.source, // keep the original source to prevent changes to it
    created: schoolToUpdate.created, // keep the original created info
    modified: editorData
  }

  let updatedSchoolId: string

  try {
    updatedSchoolId = await dbClient.schools.updateSchool(schoolNumber, updatedSchool)
  } catch (error) {
    throw new HTTPError(500, "Feilet ved oppdatering av skole", error)
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "School",
      resourceId: updatedSchoolId,
      resourceName: updatedSchool.name,
      metaData: {
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating SchoolId {SchoolId}", updatedSchoolId)
  }

  return {
    updatedSchoolId
  }
}

export const PUT: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateSchoolResponse, UpdateSchoolBody>(requestEvent, updateSchool)
}
