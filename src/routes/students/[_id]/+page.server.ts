import { getAccessTypesForStudent } from "$lib/server/authorization/access-type"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { AccessType, FrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, Document, DocumentContentTemplate, StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentPageData = {
  student: FrontendStudent
  importantStuff: StudentImportantStuff | null
  accessTypes: AccessType[]
  documents: Document[]
  documentContentTemplates: DocumentContentTemplate[]
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

  const student: FrontendStudent | null = await dbClient.getStudentById(studentDbId)
  if (!student) {
    throw new HTTPError(404, "Student not found")
  }

  const accessTypes: AccessType[] = await getAccessTypesForStudent(student, access)

  if (accessTypes.length === 0) {
    throw new HTTPError(403, "No access to this student")
  }

  const studentImportantStuff: StudentImportantStuff | null = await dbClient.getStudentImportantStuff(studentDbId)

  const documents: Document[] = await dbClient.getStudentDocuments(studentDbId)
  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.getDocumentContentTemplates({ student: true, group: false })

  return {
    data: {
      student,
      accessTypes,
      importantStuff: studentImportantStuff,
      documents,
      documentContentTemplates
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudent)
}
