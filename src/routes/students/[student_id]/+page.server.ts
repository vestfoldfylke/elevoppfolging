import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentAccessPersonsFromCache } from "$lib/server/cache/student-access-cache"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { noAccessMessage } from "$lib/shared-authorization/authorization"
import type { CachedFrontendStudent, PrincipalAccessForStudent, StudentAccessPerson, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, DocumentContentTemplate, SchoolInfo, StudentDataSharingConsent, StudentDocument, StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentPageData = {
  student: CachedFrontendStudent
  studentDataSharingConsent: StudentDataSharingConsent | null
  importantStuff: StudentImportantStuff[]
  principalAccessForStudent: PrincipalAccessForStudent[]
  studentAccessPersons: StudentAccessPerson[]
  documents: StudentDocument[]
  unavailableSchoolDocuments: StudentUnavailableSchoolDocuments[]
  documentContentTemplates: DocumentContentTemplate[]
}

const getStudent: ServerLoadNextFunction<StudentPageData> = async ({ principal, requestEvent }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new Error("Student ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  /*
	- Først henter vi tilgangene til brukeren
	- Så henter vi eleven basert på ID
	- Så har vi en støgg funksjon som sjekker at brukeren har tilgang til denne eleven - og hva slags tilgang, for da kan vi lage litt tester på funksjonen, i stedet for en psyjo query monster
	*/

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(404, "Student not found")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, access)

  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No access to this student"))
  }

  const accessSchoolsForStudent: string[] = Array.from(new Set(principalAccessForStudent.map((accessEntry) => accessEntry.schoolNumber)))

  const studentImportantStuff: StudentImportantStuff[] = await dbClient.getStudentImportantStuff(studentId, accessSchoolsForStudent) // Vi henter kun important stuff for skolene brukeren har tilgang til eleven på

  const allStudentDocuments: StudentDocument[] = await dbClient.getStudentDocuments(studentId)

  const studentDataSharingConsent: StudentDataSharingConsent | null = await dbClient.getStudentDataSharingConsent(studentId)

  // HVis eleven har consent - bare gi tilbake da! (men sjekk også tilgang på hvert dokument...)
  const documents = allStudentDocuments.filter((document) => {
    // Hvis eleven har samtykket til deling, kan vi vise alle dokumenter
    if (studentDataSharingConsent?.consent) {
      return true
    }

    // Hvis eleven ikke har samtykket til deling, kan vi kun vise dokumenter knyttet til skoler brukeren har tilgang til eleven på
    // Og vi må etterhvert også sjekke at dokumentet er tilgjengelig for DEN tilgangstypen (for eksempel hvis dokumentet ikke er tilgjengelig for faglærere)
    return principalAccessForStudent.some((accessType) => accessType.schoolNumber === document.school.schoolNumber)
  })

  const unavailableDocuments = allStudentDocuments.filter((document) => !documents.some((availableDocument) => availableDocument._id === document._id))

  const unavailableSchoolDocumentsMap: Record<string, { school: SchoolInfo; numberOfDocuments: number }> = {}
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

  const studentAccessPersons: StudentAccessPerson[] = await getStudentAccessPersonsFromCache(studentId)

  return {
    data: {
      student,
      principalAccessForStudent: principalAccessForStudent,
      importantStuff: studentImportantStuff,
      studentDataSharingConsent,
      documents,
      unavailableSchoolDocuments,
      documentContentTemplates: documentContentTemplates.sort((a, b) => a.sort - b.sort),
      studentAccessPersons
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudent)
}
