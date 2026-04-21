import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, canGrantAndRemoveAccessForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, ProgramArea } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type SchoolAccessAdministrationPageData = {
  manualAccessForSchool: Access[]
  programAreasForSchool: ProgramArea[]
}

const getSchoolAccessAdministrationData: ServerLoadNextFunction<SchoolAccessAdministrationPageData> = async ({ principal, requestEvent }) => {
  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber) {
    throw new Error("School number is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(404, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(access)) {
    throw new HTTPError(403, noAccessMessage("No permission to access school administration"))
  }

  if (!canGrantAndRemoveAccessForSchool(schoolNumber, access)) {
    return {
      data: {
        manualAccessForSchool: [],
        programAreasForSchool: []
      },
      isAuthorized: true
    }
  }

  const manualAccessForSchool: Access[] = await dbClient.getManualAccess(schoolNumber)
  const programAreasForSchool: ProgramArea[] = await dbClient.getProgramAreasForSchool(schoolNumber)

  return {
    data: {
      manualAccessForSchool,
      programAreasForSchool
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<SchoolAccessAdministrationPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getSchoolAccessAdministrationData)
}
