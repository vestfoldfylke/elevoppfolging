import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { IDbClient } from "$lib/types/db/db-client"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { AppStudent } from "$lib/types/student"
import type { PageServerLoad } from "./$types"

type StudentsPageData = {
	students: AppStudent[]
}

const getStudents: ServerLoadNextFunction<StudentsPageData> = async () => {
	const dbClient: IDbClient = getDbClient()
	const students: AppStudent[] = await dbClient.getStudents()

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
