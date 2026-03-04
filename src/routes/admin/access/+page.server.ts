import { ObjectId } from "mongodb"
import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppUser } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type AdminAccessPageData = {
  schoolLeaderAccess: Access[]
  appUsers: AppUser[]
  aDate: Date
  test: ObjectId
}

const getSchoolLeaderAccess: ServerLoadNextFunction<AdminAccessPageData> = async () => {
  // TODO validate admin access

  const dbClient: IDbClient = getDbClient()
  const schoolLeaderAccess = await dbClient.getSchoolLeaderAccess()
  const appUsers = await dbClient.getAllAppUsers()

  return {
    data: {
      schoolLeaderAccess,
      appUsers,
      aDate: new Date(),
      test: new ObjectId()
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<AdminAccessPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getSchoolLeaderAccess)
}
