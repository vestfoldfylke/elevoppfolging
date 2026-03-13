import { APP_INFO } from "$lib/server/app-info"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { isSystemAdmin } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppUser, School } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type AdminSchoolsLayoutData = {
  schools: School[]
  schoolLeaderAccess: Access[]
  appUsers: AppUser[]
}

const getAdminSchoolsData: ServerLoadNextFunction<AdminSchoolsLayoutData> = async ({ principal }) => {
  if (!isSystemAdmin(principal, APP_INFO)) {
    throw new HTTPError(403, "Forbidden: No access")
  }

  const dbClient: IDbClient = getDbClient()
  const schoolLeaderAccess = await dbClient.getSchoolLeaderAccess()
  const appUsers = await dbClient.getAllAppUsers()
  const schools = await dbClient.getSchools()

  return {
    data: {
      schools,
      schoolLeaderAccess,
      appUsers
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<AdminSchoolsLayoutData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAdminSchoolsData)
}
