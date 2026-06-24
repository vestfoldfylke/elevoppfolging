import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeSystemAdmin } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { StudentCheckBox } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentCheckBoxesPageData = {
  checkBoxes: StudentCheckBox[]
}

const getStudentCheckBoxes: ServerLoadNextFunction<StudentCheckBoxesPageData> = async ({ principal }) => {
  const authorizationResult = authorizeSystemAdmin({ authenticatedPrincipal: principal, APP_INFO })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const dbClient: IDbClient = getDbClient()
  const checkBoxes = await dbClient.studentCheckBoxes.getStudentCheckBoxes()

  return {
    checkBoxes: checkBoxes.sort((a, b) => a.sort - b.sort)
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentCheckBoxesPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudentCheckBoxes)
}
