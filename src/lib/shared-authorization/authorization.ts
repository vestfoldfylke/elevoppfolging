import type { AccessEntry, ApplicationInfo, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type {
  Access,
  DocumentInput,
  DocumentMessage,
  ManageManualStudentsManualAccessEntry,
  SchoolLeaderManualAccessEntry,
  StudentDataSharingConsent,
  StudentDocument
} from "$lib/types/db/shared-types"

export const isSystemAdmin = (authenticatedPrincipal: AuthenticatedPrincipal, APP_INFO: ApplicationInfo): boolean => {
  return authenticatedPrincipal.roles.includes(APP_INFO.ROLES.ADMIN)
}

export const canAddMessageToStudentDocument = (
  authenticatedPrincipal: AuthenticatedPrincipal,
  accessToStudent: PrincipalAccessForStudent[],
  document: StudentDocument,
  studentDataSharingConsent: StudentDataSharingConsent | null
): boolean => {
  // Hvis du kan åpne det kan du legge til melding på det
  return (
    canViewStudentDocument(authenticatedPrincipal, accessToStudent, document, studentDataSharingConsent) &&
    accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
  )
}

export const canUpdateMessageInStudentDocument = (
  authenticatedPrincipal: AuthenticatedPrincipal,
  accessToStudent: PrincipalAccessForStudent[],
  document: StudentDocument,
  message: DocumentMessage
): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id && accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
}

export const canManageManualStudentsOnSchool = (principalAccess: Access, schoolNumber: string): boolean => {
  return (
    principalAccess.leaderForSchools.some((accessEntry: SchoolLeaderManualAccessEntry) => accessEntry.schoolNumber === schoolNumber) ||
    principalAccess.manageManualStudentsForSchools.some((accessEntry: ManageManualStudentsManualAccessEntry) => accessEntry.schoolNumber === schoolNumber)
  )
}

const isOnlySubjectTeacher = (accessToStudent: PrincipalAccessForStudent[]): boolean => {
  return accessToStudent.every((accessEntry) => accessEntry.type === "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG" || accessEntry.type === "AUTOMATISK-KLASSE-TILGANG")
}

export const canViewStudentDocument = (
  authenticatedPrincipal: AuthenticatedPrincipal,
  accessToStudent: PrincipalAccessForStudent[],
  document: StudentDocument,
  studentDataSharingConsent: StudentDataSharingConsent | null
): boolean => {
  if (accessToStudent.length === 0) {
    return false
  }

  if (studentDataSharingConsent?.consent) {
    if (authenticatedPrincipal.id === document.created.by.entraUserId) {
      return true // man skal kunne se dokumentene man har opprettet selv hvis det foreligger samtykke, hvis man har tilgang til eleven
    }
    if (document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS" && isOnlySubjectTeacher(accessToStudent)) {
      return false
    }
    return true
  }

  // no consent - only documents from access schools
  const accessToStudentFromDocumentSchool: PrincipalAccessForStudent[] = accessToStudent.filter((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
  if (accessToStudentFromDocumentSchool.length === 0) {
    return false
  }
  if (document.created.by.entraUserId === authenticatedPrincipal.id) {
    return true // man skal kunne se dokumentene man har opprettet selv hvis man har tilgang til eleven ved gitt skole
  }
  if (document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS" && isOnlySubjectTeacher(accessToStudentFromDocumentSchool)) {
    return false
  }
  return true
}

export const canCreateStudentDocument = (accessToStudent: PrincipalAccessForStudent[], newDocument: DocumentInput): boolean => {
  return accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === newDocument.school.schoolNumber)
}

export const canEditStudentDocument = (authenticatedPrincipal: AuthenticatedPrincipal, accessToStudent: PrincipalAccessForStudent[], document: StudentDocument): boolean => {
  return document.created.by.entraUserId === authenticatedPrincipal.id && accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
}

export const canEditDocumentMessage = (authenticatedPrincipal: AuthenticatedPrincipal, message: DocumentMessage): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id
}

export const isSchoolLeader = (principalAccess: Access | null): boolean => {
  if (!principalAccess) {
    return false
  }
  // TODO - check that the school leader access is for a school that is active
  return principalAccess.leaderForSchools.some((schoolAccess) => schoolAccess.type === "MANUELL-SKOLELEDER-TILGANG")
}

export const canAccessSchoolAdministration = (principalAccess: Access | null): boolean => {
  return isSchoolLeader(principalAccess) || principalAccess?.manageManualStudentsForSchools.some((accessEntry: AccessEntry) => accessEntry.type === "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG") || false
}

export const canGrantAndRemoveAccessForSchool = (schoolNumber: string, principalAccess: Access): boolean => {
  return principalAccess.leaderForSchools.some((accessEntry: SchoolLeaderManualAccessEntry) => accessEntry.type === "MANUELL-SKOLELEDER-TILGANG" && accessEntry.schoolNumber === schoolNumber)
}

export const canEditStudentDataSharingConsent = (accessToStudent: PrincipalAccessForStudent[]): boolean => {
  return !isOnlySubjectTeacher(accessToStudent)
}

export const canEditStudentImportantStuff = (importantStuffSchoolNumber: string, accessToStudent: PrincipalAccessForStudent[]): boolean => {
  const accessForImportantStuffSchool = accessToStudent.filter((access) => access.schoolNumber === importantStuffSchoolNumber)
  if (accessForImportantStuffSchool.length === 0) {
    return false
  }
  return !isOnlySubjectTeacher(accessForImportantStuffSchool)
}

export const noAccessMessage = (message?: string): string => {
  if (!message) {
    return "Access denied."
  }

  return `Access denied: ${message}`
}
