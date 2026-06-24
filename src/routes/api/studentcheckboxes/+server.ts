import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateStudentCheckBox } from "$lib/data-validation/student-check-box-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentCheckBox } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"

type AddStudentCheckBoxResponse = ApiRouteMap["/api/studentcheckboxes"]["POST"]["res"]
type AddStudentCheckBoxBody = ApiRouteMap["/api/studentcheckboxes"]["POST"]["req"]

const addStudentCheckBox: ApiNextFunction<AddStudentCheckBoxResponse, AddStudentCheckBoxBody> = async ({ principal, body }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const newStudentCheckBoxData: AddStudentCheckBoxBody = body
  const validationResult = validateStudentCheckBox(newStudentCheckBoxData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid checkbox data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()
  const currentStudentCheckBoxes = await dbClient.studentCheckBoxes.getStudentCheckBoxes()

  if (currentStudentCheckBoxes.some((checkBox) => checkBox.value === newStudentCheckBoxData.value)) {
    throw new HTTPError(400, "Checkbox med samme navn finnes allerede.")
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const newStudentCheckBox: NewStudentCheckBox = {
    type: newStudentCheckBoxData.type,
    value: newStudentCheckBoxData.value,
    enabled: newStudentCheckBoxData.enabled,
    sort: newStudentCheckBoxData.sort,
    created: editorData,
    modified: editorData
  }

  let checkBoxId: string

  try {
    checkBoxId = await dbClient.studentCheckBoxes.createStudentCheckBox(newStudentCheckBox)
  } catch (error) {
    throw new HTTPError(
      500,
      `Feilet ved opprettelse av ${STUDENT_CHECKBOX_DISPLAY_NAMES[newStudentCheckBox.type].single?.toLowerCase() || STUDENT_CHECKBOX_DISPLAY_NAMES[newStudentCheckBox.type].plural.toLowerCase()} checkbox`,
      error
    )
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "StudentCheckBox",
      resourceId: checkBoxId,
      resourceName: newStudentCheckBox.value,
      metaData: {
        parentResource: "SYSTEM"
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating StudentCheckBoxId {StudentCheckBoxId}", checkBoxId)
  }

  return {
    checkBoxId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddStudentCheckBoxResponse, AddStudentCheckBoxBody>(requestEvent, addStudentCheckBox)
}
