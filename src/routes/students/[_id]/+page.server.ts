import { getStudentAccessInfo } from "$lib/server/authorization/student-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { FrontendStudent, StudentAccessInfo } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, Document, DocumentContentTemplate, SchoolInfo, StudentDataSharingConsent, StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentPageData = {
  student: FrontendStudent
  studentDataSharingConsent: StudentDataSharingConsent | null
  importantStuff: StudentImportantStuff | null
  studentAccessInfo: StudentAccessInfo
  documents: Document[]
  unavailableSchoolDocuments: {
    school: SchoolInfo,
    numberOfDocuments: number
  }[]
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

  const access: Access | null = await dbClient.getPrincipalAccess(principal)
  if (!access) {
    throw new HTTPError(404, "No access found for principal")
  }

  const student: FrontendStudent | null = await dbClient.getStudentById(studentDbId)
  if (!student) {
    throw new HTTPError(404, "Student not found")
  }

  const studentAccessInfo: StudentAccessInfo = await getStudentAccessInfo(student, access)

  if (studentAccessInfo.accessTypes.length === 0) {
    throw new HTTPError(403, "No access to this student")
  }

  const studentImportantStuff: StudentImportantStuff | null = await dbClient.getStudentImportantStuff(studentDbId, studentAccessInfo.accessTypes[0].schoolNumber) // Vi henter kun important stuff for første skolen de har eleven tilgjengelig på

  const allStudentDocuments: Document[] = await dbClient.getStudentDocuments(studentDbId)

  const studentDataSharingConsent: StudentDataSharingConsent | null = await dbClient.getStudentDataSharingConsent(studentDbId)

  const documents = allStudentDocuments.filter(document => {
    // Hvis eleven har samtykket til deling, kan vi vise alle dokumenter
    if (studentDataSharingConsent?.consent) {
      return true
    }

    // Hvis eleven ikke har samtykket til deling, kan vi kun vise dokumenter knyttet til skoler brukeren har tilgang til elevn på
    return studentAccessInfo.accessTypes.some(accessType => accessType.schoolNumber === document.school.schoolNumber)
  })

  const unavailableDocuments = allStudentDocuments.filter(document => !documents.some(availableDocument => availableDocument._id === document._id))

  const unavailableSchoolDocumentsMap: Record<string, { school: SchoolInfo, numberOfDocuments: number }> = {}
  for (const document of unavailableDocuments) {
    if (!unavailableSchoolDocumentsMap[document.school.schoolNumber]) {
      unavailableSchoolDocumentsMap[document.school.schoolNumber] = {
        school: document.school,
        numberOfDocuments: 1
      }
    } else {
      unavailableSchoolDocumentsMap[document.school.schoolNumber].numberOfDocuments++
    }
  }

  const unavailableSchoolDocuments = Object.values(unavailableSchoolDocumentsMap)

  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.getDocumentContentTemplates({ student: true, group: false })

  return {
    data: {
      student,
      studentAccessInfo,
      importantStuff: studentImportantStuff,
      studentDataSharingConsent,
      documents,
      unavailableSchoolDocuments,
      documentContentTemplates
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudent)
}
