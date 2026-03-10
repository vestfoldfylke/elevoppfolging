import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { CachedFrontendStudentWithAccessInfo } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AppUser, School } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

type AdministrationAccessLayoutData = {
  accessSchools: School[]
  accessStudents: CachedFrontendStudentWithAccessInfo[]
  appUsers: AppUser[]
}

const getAdministrationAccessData: ServerLoadNextFunction<AdministrationAccessLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()
  const principalAccess = await dbClient.getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, "No access (user has no access entries)")
  }
  const schools = await dbClient.getSchools()
  const accessSchools = schools.filter((school) => principalAccess.schools.some((accessSchool) => accessSchool.schoolNumber === school.schoolNumber))

  if (accessSchools.length === 0) {
    throw new HTTPError(403, "No access to administrate access at any schools")
  }

  const principalAccessStudents: CachedFrontendStudentWithAccessInfo[] = await getStudentsFromCache(principalAccess)

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
