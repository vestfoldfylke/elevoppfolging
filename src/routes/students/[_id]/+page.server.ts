import { getAccessType } from "$lib/server/authorization/access-type"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { Access, AccessType, AppStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentPageData = {
	student: AppStudent,
	accessType: AccessType
}

const getStudent: ServerLoadNextFunction<StudentPageData> = async ({ principal, requestEvent }) => {
	const studentDbId = requestEvent.params._id
	if (!studentDbId) {
		throw new Error("Student ID is missing in request parameters")
	}

	const dbClient: IDbClient = getDbClient()
	
	/*
	- Først henter vi tilgangene til brukeren
	- Så henter vi eleven basert på ID
	- Så har vi en støgg funksjon som sjekker at brukeren har tilgang til denne eleven - og hva slags tilgang, for da kan vi lage litt tester på funksjonen, i stedet for en psyjo query monster
	*/


	const access: Access | null = await dbClient.getAccess(principal)
	if (!access) {
		throw new HTTPError(404, "No access found for principal")
	}

	const student: AppStudent | null = await dbClient.getStudentById(studentDbId)
	if (!student) {
		throw new HTTPError(404, "Student not found")
	}

	const accessType: AccessType | null = await getAccessType(student, access)

	if (!accessType) {
		throw new HTTPError(403, "No access to this student")
	}

	return {
		data: {
			student,
			accessType
		},
		isAuthorized: true
	}
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
	return await serverLoadRequestMiddleware(requestEvent, getStudent)
}
