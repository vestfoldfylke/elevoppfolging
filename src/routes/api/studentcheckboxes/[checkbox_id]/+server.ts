import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateStudentCheckBox } from "$lib/data-validation/student-check-box-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentCheckBox } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"

type DeleteStudentCheckBoxResponse = ApiRouteMap[`/api/studentcheckboxes/${NoSlashString}`]["DELETE"]["res"]

const deleteStudentCheckBox: ApiNextFunction<DeleteStudentCheckBoxResponse> = async ({ principal, requestEvent }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const checkBoxId = requestEvent.params.checkbox_id
  if (!checkBoxId) {
    throw new HTTPError(400, "Checkbox ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingStudentCheckBoxes = await dbClient.studentCheckBoxes.getStudentCheckBoxes()
  const studentCheckBoxToDelete = existingStudentCheckBoxes.find((checkBox) => checkBox._id === checkBoxId)
  if (!studentCheckBoxToDelete) {
    throw new HTTPError(404, "Checkbox ikke funnet")
  }

  try {
    await dbClient.studentCheckBoxes.deleteStudentCheckBox(studentCheckBoxToDelete)
  } catch (error) {
    throw new HTTPError(
      500,
      `Feilet ved sletting av ${STUDENT_CHECKBOX_DISPLAY_NAMES[studentCheckBoxToDelete.type].single?.toLowerCase() || STUDENT_CHECKBOX_DISPLAY_NAMES[studentCheckBoxToDelete.type].plural.toLowerCase()} checkbox`,
      error
    )
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
      resource: "StudentCheckBox",
      resourceId: studentCheckBoxToDelete._id,
      resourceName: studentCheckBoxToDelete.value,
      metaData: {
        data: JSON.stringify({
          type: studentCheckBoxToDelete.type
        }),
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing StudentCheckBoxId {StudentCheckBoxId}", studentCheckBoxToDelete._id)
  }

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
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const checkBoxId = requestEvent.params.checkbox_id
  if (!checkBoxId) {
    throw new HTTPError(400, "Checkbox ID is missing in request parameters")
  }

  const dbClient = getDbClient()

  const existingStudentCheckBoxes = await dbClient.studentCheckBoxes.getStudentCheckBoxes()
  const studentCheckBoxToUpdate = existingStudentCheckBoxes.find((checkBox) => checkBox._id === checkBoxId)
  if (!studentCheckBoxToUpdate) {
    throw new HTTPError(404, "Checkbox ikke funnet")
  }

  const updatedStudentCheckBoxData: UpdateStudentCheckBoxBody = body
  const validationResult = validateStudentCheckBox(updatedStudentCheckBoxData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid checkbox data: ${validationResult.message}`)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const updatedStudentCheckBox: NewStudentCheckBox = {
    type: updatedStudentCheckBoxData.type,
    value: updatedStudentCheckBoxData.value,
    enabled: updatedStudentCheckBoxData.enabled,
    sort: updatedStudentCheckBoxData.sort,
    modified: editorData,
    created: studentCheckBoxToUpdate.created
  }

  let updatedCheckBoxId: string

  try {
    updatedCheckBoxId = await dbClient.studentCheckBoxes.updateStudentCheckBox(checkBoxId, updatedStudentCheckBox)
  } catch (error) {
    throw new HTTPError(
      500,
      `Feilet ved oppdatering av ${STUDENT_CHECKBOX_DISPLAY_NAMES[updatedStudentCheckBox.type].single?.toLowerCase() || STUDENT_CHECKBOX_DISPLAY_NAMES[updatedStudentCheckBox.type].plural.toLowerCase()} checkbox`,
      error
    )
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "UPDATE",
      resource: "StudentCheckBox",
      resourceId: updatedCheckBoxId,
      resourceName: updatedStudentCheckBox.value,
      metaData: {
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when updating StudentCheckBoxId {StudentCheckBoxId}", updatedCheckBoxId)
  }

  return {
    updatedCheckBoxId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<UpdateStudentCheckBoxResponse, UpdateStudentCheckBoxBody>(requestEvent, updateStudentCheckBox)
}
