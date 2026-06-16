import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getPrincipalAccessForStudent } from "$lib/server/authorization/student-access"
import { getStudentAccessPersonsFromCache } from "$lib/server/cache/student-access-cache"
import { getStudentFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canViewStudentDocument, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { CachedFrontendStudent, FrontendStudentDocument, PrincipalAccess, PrincipalAccessForStudent, StudentAccessPerson, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate, SchoolInfo, StudentDataSharingConsent, StudentDocument, StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type StudentPageData = {
  student: CachedFrontendStudent
  studentDataSharingConsent: StudentDataSharingConsent | null
  importantStuff: StudentImportantStuff[]
  principalAccessForStudent: PrincipalAccessForStudent[]
  studentAccessPersons: StudentAccessPerson[]
  documents: FrontendStudentDocument[]
  unavailableSchoolDocuments: StudentUnavailableSchoolDocuments[]
  documentContentTemplates: DocumentContentTemplate[]
}

const hideStudentDocumentContent = (document: StudentDocument): FrontendStudentDocument => {
  return {
    _id: document._id,
    created: document.created,
    modified: document.modified,
    school: document.school,
    title: "", // hide title
    content: [], // hide content
    template: document.template,
    documentAccess: document.documentAccess,
    emailAlertReceivers: document.emailAlertReceivers,
    messages: [], // hide messages
    student: document.student,
    isDocumentLocked: document.isDocumentLocked,
    isDocumentContentHidden: true
  }
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

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id) // Vi må hente ut tilgangene til brukeren for å vite om de har tilgang til eleven, og hva slags tilgang de har
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(404, "Student not found")
  }

  const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)

  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, noAccessMessage("No access to this student"))
  }

  const accessSchoolsForStudent: string[] = Array.from(new Set(principalAccessForStudent.map((accessEntry) => accessEntry.schoolNumber)))

  const studentImportantStuff: StudentImportantStuff[] = await dbClient.importantStuff.getStudentImportantStuff(studentId, accessSchoolsForStudent) // Vi henter kun important stuff for skolene brukeren har tilgang til eleven på

  const allStudentDocuments: StudentDocument[] = await dbClient.documents.getStudentDocuments(studentId)

  const studentDataSharingConsent: StudentDataSharingConsent | null = await dbClient.studentDataSharingConsents.getStudentDataSharingConsent(studentId)

  const viewableStudentDocuments: FrontendStudentDocument[] = allStudentDocuments
    .map((document) => {
      const canViewResult = canViewStudentDocument(principal, principalAccessForStudent, document, studentDataSharingConsent)
      if (canViewResult.canView) {
        return canViewResult.mustHideDocumentContent ? hideStudentDocumentContent(document) : { ...document, isDocumentContentHidden: false }
      }
      return null
    })
    .filter((document) => document !== null)
    .sort((a, b) => {
      const aDate = a.messages.length > 0 ? Math.max(...a.messages.map((m) => m.created.at.getTime())) : a.created.at.getTime()
      const bDate = b.messages.length > 0 ? Math.max(...b.messages.map((m) => m.created.at.getTime())) : b.created.at.getTime()
      return bDate - aDate
    })

  const unavailableDocumentsAtOtherSchools: StudentDocument[] = allStudentDocuments.filter((document) => {
    if (studentDataSharingConsent?.consent) {
      return false // hvis det er samtykke, så er det ingen dokumenter som er utilgjengelige
    }
    // Hvis det ikke er samtykke, så er det kun dokumenter fra skoler man ikke har tilgang til som er utilgjengelige
    return !principalAccessForStudent.some((access) => access.schoolNumber === document.school.schoolNumber)
  })

  const unavailableSchoolDocumentsMap: Record<string, { school: SchoolInfo; numberOfDocuments: number }> = {}
  for (const document of unavailableDocumentsAtOtherSchools) {
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

  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.documentContentTemplates.getDocumentContentTemplates({ student: true })

  const studentAccessPersons: StudentAccessPerson[] = await getStudentAccessPersonsFromCache(studentId)

  return {
    student,
    principalAccessForStudent: principalAccessForStudent,
    importantStuff: studentImportantStuff,
    studentDataSharingConsent,
    documents: viewableStudentDocuments,
    unavailableSchoolDocuments,
    documentContentTemplates: documentContentTemplates.sort((a, b) => a.sort - b.sort),
    studentAccessPersons
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudent)
}
