import { getAppUsersFromCache } from "$lib/server/cache/users-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, canGrantAndRemoveAccessForSchool, canManageManualStudentsOnSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AppUser, School } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type AdministrationAccessLayoutData = {
  accessSchools: School[]
  appUsers: AppUser[]
}

const getAdministrationAccessData: ServerLoadNextFunction<AdministrationAccessLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()

  const principalAccess = await dbClient.getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No permission to access school administration"))
  }

  const schools = await dbClient.getSchools()
  const allowedToAdministrateSchools = schools.filter(
    (school) => canGrantAndRemoveAccessForSchool(school.schoolNumber, principalAccess) || canManageManualStudentsOnSchool(principalAccess, school.schoolNumber)
  )

  if (allowedToAdministrateSchools.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to administrate any schools"))
  }

  const appUsers = (await getAppUsersFromCache()).sort((a, b) => a.entra.displayName.localeCompare(b.entra.displayName))

  return {
    data: {
      accessSchools: allowedToAdministrateSchools,
      appUsers
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<AdministrationAccessLayoutData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAdministrationAccessData)
}
