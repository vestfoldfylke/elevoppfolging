import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canGrantAndRemoveAccessForSchool, isSchoolLeader, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AppUser, School } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type AdministrationAccessLayoutData = {
  accessSchools: School[]
  accessStudents: PrincipalAccessStudent[]
  appUsers: AppUser[]
}

const getAdministrationAccessData: ServerLoadNextFunction<AdministrationAccessLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()

  const principalAccess = await dbClient.getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!isSchoolLeader(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No permission to handle access"))
  }

  const schools = await dbClient.getSchools()
  const accessSchools = schools.filter((school) => canGrantAndRemoveAccessForSchool(school.schoolNumber, principalAccess))

  if (accessSchools.length === 0) {
    throw new HTTPError(403, noAccessMessage("No permission to administrate access at any schools"))
  }

  const principalAccessStudents: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)

  // Only return students that user have school access for
  const accessStudents = principalAccessStudents.filter((student) => student.accessTypes.some((accessType) => accessType.type === "MANUELL-SKOLELEDER-TILGANG"))

  const appUsers = await dbClient.getAllAppUsers()

  return {
    data: {
      accessSchools,
      accessStudents,
      appUsers
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<AdministrationAccessLayoutData> => {
  return await serverLoadRequestMiddleware(requestEvent, getAdministrationAccessData)
}
