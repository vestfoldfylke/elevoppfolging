import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type SchoolAccessAdministrationPageData = {
  manualAccessForSchool: Access[]
}

const getSchoolAccessAdministrationData: ServerLoadNextFunction<SchoolAccessAdministrationPageData> = async ({ principal, requestEvent }) => {
  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber) {
    throw new Error("School number is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(404, "No access found for principal")
  }

  if (!access.schools.some((schoolAccess) => schoolAccess.schoolNumber === schoolNumber)) {
    throw new HTTPError(403, "No access to this administrate access for this school")
  }

  const manualAccessForSchool: Access[] = await dbClient.getManualAccess(schoolNumber)

  return {
    data: {
      manualAccessForSchool
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<SchoolAccessAdministrationPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getSchoolAccessAdministrationData)
}
