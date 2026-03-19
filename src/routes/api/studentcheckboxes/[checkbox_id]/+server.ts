import type { RequestHandler } from "@sveltejs/kit"
import { validateStudentCheckBox } from "$lib/data-validation/student-check-box-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { NewStudentCheckBox } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type DeleteStudentCheckBoxResponse = ApiRouteMap[`/api/studentcheckboxes/${NoSlashString}`]["DELETE"]["res"]

const deleteStudentCheckBox: ApiNextFunction<DeleteStudentCheckBoxResponse> = async ({ principal, requestEvent }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const checkBoxId = requestEvent.params.checkbox_id
  if (!checkBoxId) {
    throw new HTTPError(400, "Check box ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingStudentCheckBoxes = await dbClient.getStudentCheckBoxes()
  const studentCheckBoxToDelete = existingStudentCheckBoxes.find((checkBox) => checkBox._id === checkBoxId)
  if (!studentCheckBoxToDelete) {
    throw new HTTPError(404, "Student check box not found. Cannot delete non-existing check box.")
  }

  await dbClient.deleteStudentCheckBox(checkBoxId)

  return {
    deletedCheckBoxId: checkBoxId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<DeleteStudentCheckBoxResponse>(requestEvent, deleteStudentCheckBox)
}

type UpdateStudentCheckBoxResponse = ApiRouteMap[`/api/studentcheckboxes/${NoSlashString}`]["PATCH"]["res"]
type UpdateStudentCheckBoxBody = ApiRouteMap[`/api/studentcheckboxes/${NoSlashString}`]["PATCH"]["req"]

const updateStudentCheckBox: ApiNextFunction<UpdateStudentCheckBoxResponse, UpdateStudentCheckBoxBody> = async ({ principal, requestEvent, body }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const checkBoxId = requestEvent.params.checkbox_id
  if (!checkBoxId) {
    throw new HTTPError(400, "Check box ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingStudentCheckBoxes = await dbClient.getStudentCheckBoxes()
  const studentCheckBoxToUpdate = existingStudentCheckBoxes.find((checkBox) => checkBox._id === checkBoxId)
  if (!studentCheckBoxToUpdate) {
    throw new HTTPError(404, "Student check box not found. Cannot update non-existing check box.")
  }

  const updatedStudentCheckBoxData: UpdateStudentCheckBoxBody = body
  const validationResult = validateStudentCheckBox(updatedStudentCheckBoxData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid student check box data: ${validationResult.message}`)
  }

  const updatedStudentCheckBox: NewStudentCheckBox = {
    type: updatedStudentCheckBoxData.type,
    value: updatedStudentCheckBoxData.value,
    enabled: updatedStudentCheckBoxData.enabled,
    sort: updatedStudentCheckBoxData.sort,
    modified: {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    },
    created: studentCheckBoxToUpdate.created
  }

  const updatedCheckBoxId = await dbClient.updateStudentCheckBox(checkBoxId, updatedStudentCheckBox)

  return {
    updatedCheckBoxId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateStudentCheckBoxResponse, UpdateStudentCheckBoxBody>(requestEvent, updateStudentCheckBox)
}
