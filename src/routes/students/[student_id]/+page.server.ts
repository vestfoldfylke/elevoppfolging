import { resolveStudentContext } from "$lib/server/authorization/principal-context"
import { getStudentAccessPersonsFromCache } from "$lib/server/cache/student-access-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeStudentDocumentAccess } from "$lib/shared-authorization/authorization"
import type { CachedFrontendStudent, FrontendStudentDocument, PrincipalAccessForStudent, StudentAccessPerson, StudentUnavailableSchoolDocuments } from "$lib/types/app-types"
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

const hideStudentDocument = (document: StudentDocument): FrontendStudentDocument => {
  return {
    _id: document._id,
    created: document.created,
    modified: document.modified,
    school: {
      name: "",
      schoolNumber: ""
    },
    title: "", // hide title
    content: [], // hide content
    template: {
      _id: "",
      name: "",
      version: 0
    },
    documentAccess: document.documentAccess,
    emailAlertReceivers: [], // hide email alert receivers
    messages: [], // hide messages
    student: document.student,
    isDocumentLocked: document.isDocumentLocked,
    isDocumentContentHidden: true,
    isDocumentHidden: true
  }
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
    emailAlertReceivers: [], // hide email alert receivers
    messages: [], // hide messages
    student: document.student,
    isDocumentLocked: document.isDocumentLocked,
    isDocumentContentHidden: true,
    isDocumentHidden: false
  }
}

const getStudent: ServerLoadNextFunction<StudentPageData> = async ({ principal, requestEvent }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const { student, principalAccessForStudent } = await resolveStudentContext(principal, studentId)

  const accessSchoolsForStudent: string[] = Array.from(new Set(principalAccessForStudent.map((accessEntry) => accessEntry.schoolNumber)))

  const studentImportantStuff: StudentImportantStuff[] = await dbClient.importantStuff.getStudentImportantStuff(studentId, accessSchoolsForStudent) // Vi henter kun important stuff for skolene brukeren har tilgang til eleven på

  const allStudentDocuments: StudentDocument[] = await dbClient.documents.getStudentDocuments(studentId)

  const studentDataSharingConsent: StudentDataSharingConsent | null = await dbClient.studentDataSharingConsents.getStudentDataSharingConsent(studentId)

  const viewableStudentDocuments: FrontendStudentDocument[] = allStudentDocuments
    .sort((a, b) => {
      const aDate = a.messages.length > 0 ? Math.max(...a.messages.map((m) => m.modified.at.getTime())) : a.modified.at.getTime()
      const bDate = b.messages.length > 0 ? Math.max(...b.messages.map((m) => m.modified.at.getTime())) : b.modified.at.getTime()
      return bDate - aDate
    })
    .map((document) => {
      const authorizationResult = authorizeStudentDocumentAccess({ authenticatedPrincipal: principal, accessToStudent: principalAccessForStudent, document, studentDataSharingConsent })

      if (!authorizationResult.canView) {
        return null
      }

      if (authorizationResult.mustHideDocument) {
        return hideStudentDocument(document)
      }

      if (authorizationResult.mustHideDocumentContent) {
        return hideStudentDocumentContent(document)
      }

      return {
        ...document,
        isDocumentContentHidden: false,
        isDocumentHidden: false
      }
    })
    .filter((document) => document !== null)

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
