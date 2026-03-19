import type { RequestHandler } from "@sveltejs/kit"
import { validateStudentCheckBox } from "$lib/data-validation/student-check-box-validation"
import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentCheckBox } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type AddStudentCheckBoxResponse = ApiRouteMap["/api/studentcheckboxes"]["POST"]["res"]
type AddStudentCheckBoxBody = ApiRouteMap["/api/studentcheckboxes"]["POST"]["req"]

const addStudentCheckBox: ApiNextFunction<AddStudentCheckBoxResponse, AddStudentCheckBoxBody> = async ({ principal, body }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const newStudentCheckBoxData: AddStudentCheckBoxBody = body
  const validationResult = validateStudentCheckBox(newStudentCheckBoxData)
  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid student-check-box data: ${validationResult.message}`)
  }

  const dbClient = getDbClient()
  const currentStudentCheckBoxes = await dbClient.getStudentCheckBoxes()

  if (currentStudentCheckBoxes.some((checkBox) => checkBox.value === newStudentCheckBoxData.value)) {
    throw new HTTPError(400, "A student check box with the same value already exists.")
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

  const checkBoxId = await dbClient.createStudentCheckBox(newStudentCheckBox)

  return {
    checkBoxId
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<AddStudentCheckBoxResponse, AddStudentCheckBoxBody>(requestEvent, addStudentCheckBox)
}
