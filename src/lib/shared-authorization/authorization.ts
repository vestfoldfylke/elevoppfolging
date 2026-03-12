import type { AccessEntry, ApplicationInfo } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { Access, DocumentMessage, StudentDocument, StudentImportantStuff, StudentImportantStuffInput } from "$lib/types/db/shared-types"

export const isSystemAdmin = (authenticatedPrincipal: AuthenticatedPrincipal, APP_INFO: ApplicationInfo): boolean => {
  return authenticatedPrincipal.roles.includes(APP_INFO.ROLES.ADMIN)
}

export const canEditDocument = (authenticatedPrincipal: AuthenticatedPrincipal, document: StudentDocument): boolean => {
  return document.created.by.entraUserId === authenticatedPrincipal.id
}

export const canEditDocumentMessage = (authenticatedPrincipal: AuthenticatedPrincipal, message: DocumentMessage): boolean => {
  return message.created.by.entraUserId === authenticatedPrincipal.id
}

export const canGrantAndRemoveAccessForSchool = (schoolNumber: string, principalAccess: Access): boolean => {
  return principalAccess.schools.some((schoolAccess) => schoolAccess.type === "MANUELL-SKOLELEDER-TILGANG" && schoolAccess.schoolNumber === schoolNumber)
}

export const canEditStudentDataSharingConsent = (accessToStudent: AccessEntry[]): boolean => {
  return accessToStudent.some((accessEntry) => accessEntry.type !== "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG" && accessEntry.type !== "AUTOMATISK-KLASSE-TILGANG")
}

export const canEditStudentImportantStuff = (importantStuffSchoolNumber: string, accessToStudent: AccessEntry[]): boolean => {
  return accessToStudent.some((accessEntry) => accessEntry.type !== "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG" && accessEntry.type !== "AUTOMATISK-KLASSE-TILGANG" && accessEntry.schoolNumber === importantStuffSchoolNumber)
}
