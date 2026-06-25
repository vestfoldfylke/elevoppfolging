import { resolvePrincipalAccess } from "$lib/server/authorization/principal-context"
import { getAppUsersFromCache } from "$lib/server/cache/users-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeManageManualStudentsOnSchool, authorizeSchoolAdministrationAccess, authorizeSchoolLeaderForSchool } from "$lib/shared-authorization/authorization"
import type { AccessControlAppUser } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AppUser, School } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type AdministrationAccessLayoutData = {
  accessSchools: School[]
  appUsers: AccessControlAppUser[]
}

const getAdministrationAccessData: ServerLoadNextFunction<AdministrationAccessLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()

  const principalAccess = await resolvePrincipalAccess(principal)

  const authorizationResult = authorizeSchoolAdministrationAccess(principalAccess)
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const schools = await dbClient.schools.getSchools()
  const allowedToAdministrateSchools = schools.filter(
    (school) =>
      authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber: school.schoolNumber }).authorized ||
      authorizeManageManualStudentsOnSchool({ principalAccess, schoolNumber: school.schoolNumber }).authorized
  )

  if (allowedToAdministrateSchools.length === 0) {
    throw new HTTPError(403, "Ingen tilgang til å håndtere skoler")
  }

  const appUsers: AppUser[] = await getAppUsersFromCache()

  const accessControlAppUsers: AccessControlAppUser[] = appUsers
    .map((appUser) => ({
      entraUserId: appUser.entra.id,
      displayName: appUser.entra.displayName,
      companyName: appUser.entra.companyName
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return {
    accessSchools: allowedToAdministrateSchools,
    appUsers: accessControlAppUsers
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<AdministrationAccessLayoutData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAdministrationAccessData)
}
