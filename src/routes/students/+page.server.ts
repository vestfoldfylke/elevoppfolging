import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { FrontendOverviewStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentsPageData = {
  students: FrontendOverviewStudent[]
}

const getStudents: ServerLoadNextFunction<StudentsPageData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()
  /*
	- Get access for current principal
	- Pass access to dbClient.getStudents to filter students based on access
	- Returns list of students with some (but not too much) data - klasser navn, kontaktlærer etc
	*/
  const access = await dbClient.getAccess(principal)

  if (!access) {
    return {
      data: {
        students: []
      },
      isAuthorized: false
    }
  }

  const students: FrontendOverviewStudent[] = await dbClient.getStudents(access)

  return {
    data: {
      students
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentsPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudents)
}
