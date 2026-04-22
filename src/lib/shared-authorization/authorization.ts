import type { AccessEntry, ApplicationInfo, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { Access, DocumentInput, DocumentMessage, ManageManualStudentsManualAccessEntry, SchoolLeaderManualAccessEntry, StudentDocument } from "$lib/types/db/shared-types"

export const isSystemAdmin = (authenticatedPrincipal: AuthenticatedPrincipal, APP_INFO: ApplicationInfo): boolean => {
  return authenticatedPrincipal.roles.includes(APP_INFO.ROLES.ADMIN)
}

export const canAddMessageToStudentDocument = (accessToStudent: PrincipalAccessForStudent[], document: StudentDocument): boolean => {
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

export const canManageManualStudentsOnSchool = (principalAccess: Access, schoolNumber: string): boolean => {
  return (
    principalAccess.leaderForSchools.some((accessEntry: SchoolLeaderManualAccessEntry) => accessEntry.schoolNumber === schoolNumber) ||
    principalAccess.manageManualStudentsForSchools.some((accessEntry: ManageManualStudentsManualAccessEntry) => accessEntry.schoolNumber === schoolNumber)
  )
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
  return accessToStudent.some((accessEntry) => accessEntry.type !== "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG" && accessEntry.type !== "AUTOMATISK-KLASSE-TILGANG")
}

export const canEditStudentImportantStuff = (importantStuffSchoolNumber: string, accessToStudent: PrincipalAccessForStudent[]): boolean => {
  return accessToStudent.some(
    (accessEntry) => accessEntry.type !== "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG" && accessEntry.type !== "AUTOMATISK-KLASSE-TILGANG" && accessEntry.schoolNumber === importantStuffSchoolNumber
  )
}

export const noAccessMessage = (message?: string): string => {
  if (!message) {
    return "Access denied."
  }

  return `Access denied: ${message}`
}
