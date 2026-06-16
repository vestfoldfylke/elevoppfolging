import type { AccessEntry, ApplicationInfo, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type {
  Access,
  DocumentInput,
  DocumentMessage,
  GroupDocument,
  ManageManualStudentsManualAccessEntry,
  SchoolLeaderManualAccessEntry,
  StudentDataSharingConsent,
  StudentDocument
} from "$lib/types/db/shared-types"
import { SUBJECT_TEACHER_ACCESS_TYPES } from "$lib/utils/access-constants"

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
  const canViewResult = canViewStudentDocument(authenticatedPrincipal, accessToStudent, document, studentDataSharingConsent)
  if (!canViewResult.canView || canViewResult.mustHideDocumentContent) {
    return false
  }
  return accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
}

export const canUpdateMessageInStudentDocument = (
  authenticatedPrincipal: AuthenticatedPrincipal,
  accessToStudent: PrincipalAccessForStudent[],
  document: StudentDocument,
  message: DocumentMessage
): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id && accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
}

export const canUpdateMessageInGroupDocument = (authenticatedPrincipal: AuthenticatedPrincipal, message: DocumentMessage): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id
}

export const canManageManualStudentsOnSchool = (principalAccess: Access, schoolNumber: string): boolean => {
  return (
    principalAccess.leaderForSchools.some((accessEntry: SchoolLeaderManualAccessEntry) => accessEntry.schoolNumber === schoolNumber) ||
    principalAccess.manageManualStudentsForSchools.some((accessEntry: ManageManualStudentsManualAccessEntry) => accessEntry.schoolNumber === schoolNumber)
  )
}

export const isOnlySubjectTeacher = (accessToStudent: PrincipalAccessForStudent[]): boolean => {
  return accessToStudent.every((accessEntry) => (SUBJECT_TEACHER_ACCESS_TYPES as readonly string[]).includes(accessEntry.type))
}

type CanViewStudentDocumentTrueResult = {
  canView: true
  mustHideDocumentContent: boolean
}

type CanViewStudentDocumentFalseResult = {
  canView: false
  mustHideDocumentContent: null
}

export type CanViewStudentDocumentResult = CanViewStudentDocumentTrueResult | CanViewStudentDocumentFalseResult

export const canViewStudentDocument = (
  authenticatedPrincipal: AuthenticatedPrincipal,
  accessToStudent: PrincipalAccessForStudent[],
  document: StudentDocument,
  studentDataSharingConsent: StudentDataSharingConsent | null
): CanViewStudentDocumentResult => {
  if (accessToStudent.length === 0) {
    return { canView: false, mustHideDocumentContent: null }
  }

  const hasRequiredDocumentAccess = (accessToStudentList: PrincipalAccessForStudent[]): CanViewStudentDocumentResult => {
    if (authenticatedPrincipal.id === document.created.by.entraUserId) {
      return { canView: true, mustHideDocumentContent: false }
    }

    if (document.documentAccess === "ONLY_CREATOR") {
      if (accessToStudentList.some((access) => access.type === "MANUELL-SKOLELEDER-TILGANG" && access.schoolNumber === document.school.schoolNumber)) {
        return { canView: true, mustHideDocumentContent: true }
      }

      return { canView: false, mustHideDocumentContent: null }
    }

    if (document.documentAccess === "ALL_WITH_STUDENT_ACCESS") {
      return { canView: true, mustHideDocumentContent: false }
    }

    return !(document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS" && isOnlySubjectTeacher(accessToStudentList))
      ? { canView: true, mustHideDocumentContent: false }
      : { canView: false, mustHideDocumentContent: null }
  }

  if (studentDataSharingConsent?.consent) {
    return hasRequiredDocumentAccess(accessToStudent)
  }

  // no consent - only documents from access schools
  const accessToStudentFromDocumentSchool: PrincipalAccessForStudent[] = accessToStudent.filter((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
  if (accessToStudentFromDocumentSchool.length === 0) {
    return { canView: false, mustHideDocumentContent: null }
  }

  return hasRequiredDocumentAccess(accessToStudentFromDocumentSchool)
}

export const canCreateStudentDocument = (accessToStudent: PrincipalAccessForStudent[], newDocument: DocumentInput): boolean => {
  return accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === newDocument.school.schoolNumber)
}

export const canEditGroupDocument = (authenticatedPrincipal: AuthenticatedPrincipal, document: GroupDocument): boolean => {
  return document.created.by.entraUserId === authenticatedPrincipal.id
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

export const isSchoolLeaderForSchool = (principalAccess: Access | null, schoolNumber: string): boolean => {
  if (!principalAccess) {
    return false
  }

  return principalAccess.leaderForSchools.some((schoolAccess: SchoolLeaderManualAccessEntry) => schoolAccess.type === "MANUELL-SKOLELEDER-TILGANG" && schoolAccess.schoolNumber === schoolNumber)
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
