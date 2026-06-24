import type { ApplicationInfo, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { Access, DocumentInput, DocumentMessage, GroupDocument, SchoolLeaderManualAccessEntry, StudentClassGroup, StudentDataSharingConsent, StudentDocument } from "$lib/types/db/shared-types"
import { SUBJECT_TEACHER_ACCESS_TYPES } from "$lib/utils/access-constants"

export type AuthorizationResult = { authorized: true } | { authorized: false; message: string }

export const DOCUMENT_IS_LOCKED_MESSAGE = "Elevnotatet er låst og kan ikke redigeres"

export type AuthorizeSystemAdminInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  APP_INFO: ApplicationInfo
}

export const NOT_SYSTEM_ADMIN_MESSAGE = "Bruker er ikke systemadministrator"

export function authorizeSystemAdmin({ authenticatedPrincipal, APP_INFO }: AuthorizeSystemAdminInput): AuthorizationResult {
  if (authenticatedPrincipal.roles.includes(APP_INFO.ROLES.ADMIN)) {
    return {
      authorized: true
    }
  }
  return {
    authorized: false,
    message: NOT_SYSTEM_ADMIN_MESSAGE
  }
}

export type AuthorizeAddMessageToStudentDocumentInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  accessToStudent: PrincipalAccessForStudent[]
  document: StudentDocument
  studentDataSharingConsent: StudentDataSharingConsent | null
}

export const CANNOT_ADD_MESSAGE_TO_STUDENT_DOCUMENT_MESSAGE = "Ingen tilgang til å legge til melding på elevnotatet"

export function authorizeAddMessageToStudentDocument({ authenticatedPrincipal, accessToStudent, document, studentDataSharingConsent }: AuthorizeAddMessageToStudentDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: DOCUMENT_IS_LOCKED_MESSAGE
    }
  }

  const canViewResult = authorizeStudentDocumentAccess({ authenticatedPrincipal, accessToStudent, document, studentDataSharingConsent })
  if (!canViewResult.canView || canViewResult.mustHideDocumentContent) {
    return {
      authorized: false,
      message: CANNOT_ADD_MESSAGE_TO_STUDENT_DOCUMENT_MESSAGE
    }
  }
  return {
    authorized: true
  }
}

export type AuthorizeEditMessageInStudentDocumentInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  document: StudentDocument
  message: DocumentMessage
}

export const CANNOT_EDIT_MESSAGE_IN_STUDENT_DOCUMENT_MESSAGE = "Ingen tilgang til å redigere melding på elevnotatet"

export function authorizeEditMessageInStudentDocument({ authenticatedPrincipal, document, message }: AuthorizeEditMessageInStudentDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: DOCUMENT_IS_LOCKED_MESSAGE
    }
  }

  if (message.created.by.entraUserId !== authenticatedPrincipal.id) {
    return {
      authorized: false,
      message: CANNOT_EDIT_MESSAGE_IN_STUDENT_DOCUMENT_MESSAGE
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeAddMessageToGroupDocumentInput = {
  document: GroupDocument
  principalClasses: StudentClassGroup[]
}

export const CANNOT_ADD_MESSAGE_TO_GROUP_DOCUMENT_MESSAGE = "Ingen tilgang til å legge til melding på gruppedokumentet"

export function authorizeAddMessageToGroupDocument({ document, principalClasses }: AuthorizeAddMessageToGroupDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: "Gruppedokumentet er låst og kan ikke redigeres"
    }
  }

  if (!principalClasses.some((classEntry: StudentClassGroup) => classEntry.systemId === document.group.systemId)) {
    return {
      authorized: false,
      message: CANNOT_ADD_MESSAGE_TO_GROUP_DOCUMENT_MESSAGE
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeEditMessageInGroupDocumentInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  document: GroupDocument
  message: DocumentMessage
}

export function authorizeEditMessageInGroupDocument({ authenticatedPrincipal, document, message }: AuthorizeEditMessageInGroupDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: "Gruppedokumentet er låst og kan ikke redigeres"
    }
  }

  if (message.created.by.entraUserId !== authenticatedPrincipal.id) {
    return {
      authorized: false,
      message: "Ingen tilgang til å redigere melding på gruppedokumentet"
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeManageManualStudentsOnSchoolInput = {
  principalAccess: Access
  schoolNumber: string
}

export function authorizeManageManualStudentsOnSchool({ principalAccess, schoolNumber }: AuthorizeManageManualStudentsOnSchoolInput): AuthorizationResult {
  if (authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber }).authorized || principalAccess.manageManualStudentsForSchools.some((accessEntry) => accessEntry.schoolNumber === schoolNumber)) {
    return {
      authorized: true
    }
  }

  return {
    authorized: false,
    message: "Ingen tilgang til å administrere manuelle elever på skolen"
  }
}

export function isOnlySubjectTeacher(accessToStudent: PrincipalAccessForStudent[]): boolean {
  return accessToStudent.every((accessEntry) => (SUBJECT_TEACHER_ACCESS_TYPES as readonly string[]).includes(accessEntry.type))
}

type AuthorizeStudentDocumentAccessTrueResult = {
  canView: true
  mustHideDocumentContent: boolean
}

type AuthorizeStudentDocumentAccessFalseResult = {
  canView: false
}

export type AuthorizeStudentDocumentAccessResult = AuthorizeStudentDocumentAccessTrueResult | AuthorizeStudentDocumentAccessFalseResult

export type AuthorizeStudentDocumentAccessInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  accessToStudent: PrincipalAccessForStudent[]
  document: StudentDocument
  studentDataSharingConsent: StudentDataSharingConsent | null
}

export function authorizeStudentDocumentAccess({
  authenticatedPrincipal,
  accessToStudent,
  document,
  studentDataSharingConsent
}: AuthorizeStudentDocumentAccessInput): AuthorizeStudentDocumentAccessResult {
  if (accessToStudent.length === 0) {
    return { canView: false }
  }

  const checkRequiredDocumentAccess = (accessToStudentList: PrincipalAccessForStudent[]): AuthorizeStudentDocumentAccessResult => {
    if (authenticatedPrincipal.id === document.created.by.entraUserId) {
      return { canView: true, mustHideDocumentContent: false }
    }

    if (document.documentAccess === "ONLY_CREATOR") {
      if (accessToStudentList.some((access) => access.type === "MANUELL-SKOLELEDER-TILGANG" && access.schoolNumber === document.school.schoolNumber)) {
        return { canView: true, mustHideDocumentContent: true }
      }

      return { canView: false }
    }

    if (document.documentAccess === "ALL_WITH_STUDENT_ACCESS") {
      return { canView: true, mustHideDocumentContent: false }
    }

    return !(document.documentAccess === "EXCLUDE_SUBJECT_TEACHERS" && isOnlySubjectTeacher(accessToStudentList)) ? { canView: true, mustHideDocumentContent: false } : { canView: false }
  }

  if (studentDataSharingConsent?.consent) {
    return checkRequiredDocumentAccess(accessToStudent)
  }

  // no consent - only documents from access schools
  const accessToStudentFromDocumentSchool: PrincipalAccessForStudent[] = accessToStudent.filter((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)
  if (accessToStudentFromDocumentSchool.length === 0) {
    return { canView: false }
  }

  return checkRequiredDocumentAccess(accessToStudentFromDocumentSchool)
}

export type AuthorizeCreateStudentDocumentInput = {
  accessToStudent: PrincipalAccessForStudent[]
  newDocument: DocumentInput
}

export function authorizeCreateStudentDocument({ accessToStudent, newDocument }: AuthorizeCreateStudentDocumentInput): AuthorizationResult {
  if (!accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === newDocument.school.schoolNumber)) {
    return {
      authorized: false,
      message: "Ingen tilgang til å opprette elevnotat for eleven på denne skolen"
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeEditStudentDocumentInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  accessToStudent: PrincipalAccessForStudent[]
  document: StudentDocument
}

export const CANNOT_EDIT_STUDENT_DOCUMENT_MESSAGE = "Ingen tilgang til å redigere elevnotatet"

export function authorizeEditStudentDocument({ authenticatedPrincipal, accessToStudent, document }: AuthorizeEditStudentDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: DOCUMENT_IS_LOCKED_MESSAGE
    }
  }

  if (document.created.by.entraUserId !== authenticatedPrincipal.id) {
    return {
      authorized: false,
      message: CANNOT_EDIT_STUDENT_DOCUMENT_MESSAGE
    }
  }

  if (!accessToStudent.some((access: PrincipalAccessForStudent) => access.schoolNumber === document.school.schoolNumber)) {
    return {
      authorized: false,
      message: CANNOT_EDIT_STUDENT_DOCUMENT_MESSAGE
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeEditGroupDocumentInput = {
  authenticatedPrincipal: AuthenticatedPrincipal
  document: GroupDocument
}

export function authorizeEditGroupDocument({ authenticatedPrincipal, document }: AuthorizeEditGroupDocumentInput): AuthorizationResult {
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: "Gruppedokumentet er låst og kan ikke redigeres"
    }
  }

  if (document.created.by.entraUserId !== authenticatedPrincipal.id) {
    return {
      authorized: false,
      message: "Ingen tilgang til å redigere gruppedokumentet"
    }
  }

  return {
    authorized: true
  }
}

export function authorizeSchoolLeader(principalAccess: Access | null): AuthorizationResult {
  if (!principalAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang som skoleleder"
    }
  }

  if (principalAccess.leaderForSchools.length === 0) {
    return {
      authorized: false,
      message: "Ingen tilgang som skoleleder"
    }
  }

  return {
    authorized: true
  }
}

export type AuthorizeSchoolLeaderForSchoolInput = {
  principalAccess: Access | null
  schoolNumber: string
}

export function authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber }: AuthorizeSchoolLeaderForSchoolInput): AuthorizationResult {
  if (!principalAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang som skoleleder"
    }
  }

  const hasAccess = principalAccess.leaderForSchools.some(
    (schoolAccess: SchoolLeaderManualAccessEntry) => schoolAccess.type === "MANUELL-SKOLELEDER-TILGANG" && schoolAccess.schoolNumber === schoolNumber
  )
  if (!hasAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang som skoleleder for denne skolen"
    }
  }

  return {
    authorized: true
  }
}

export function authorizeSchoolAdministrationAccess(principalAccess: Access | null): AuthorizationResult {
  if (!principalAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang som skoleleder eller administrasjon"
    }
  }

  if (authorizeSchoolLeader(principalAccess).authorized) {
    return {
      authorized: true
    }
  }

  if (principalAccess.manageManualStudentsForSchools.length > 0) {
    return {
      authorized: true
    }
  }

  return {
    authorized: false,
    message: "Ingen tilgang til skoleadministrasjon"
  }
}

export type AuthorizeGrantAndRemoveAccessForSchoolInput = {
  principalAccess: Access
  schoolNumber: string
}

export function authorizeGrantAndRemoveAccessForSchool({ principalAccess, schoolNumber }: AuthorizeGrantAndRemoveAccessForSchoolInput): AuthorizationResult {
  return authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber })
}

export function authorizeEditStudentDataSharingConsent(accessToStudent: PrincipalAccessForStudent[]): AuthorizationResult {
  if (!isOnlySubjectTeacher(accessToStudent)) {
    return {
      authorized: true
    }
  }

  return {
    authorized: false,
    message: "Ingen tilgang til å redigere samtykke for deling av elevdata"
  }
}

export type AuthorizeEditStudentImportantStuffInput = {
  importantStuffSchoolNumber: string
  accessToStudent: PrincipalAccessForStudent[]
}

export function authorizeEditStudentImportantStuff({ importantStuffSchoolNumber, accessToStudent }: AuthorizeEditStudentImportantStuffInput): AuthorizationResult {
  const accessForImportantStuffSchool = accessToStudent.filter((access) => access.schoolNumber === importantStuffSchoolNumber)
  if (accessForImportantStuffSchool.length === 0) {
    return {
      authorized: false,
      message: "Ingen tilgang til å redigere viktig informasjon for eleven på denne skolen"
    }
  }
  if (!isOnlySubjectTeacher(accessForImportantStuffSchool)) {
    return {
      authorized: true
    }
  }

  return {
    authorized: false,
    message: "Ingen tilgang til å redigere viktig informasjon for eleven på denne skolen"
  }
}

export type AuthorizeDeleteStudentDocumentInput = {
  principalAccess: PrincipalAccess | null
  document: StudentDocument
}

export function authorizeDeleteStudentDocument({ principalAccess, document }: AuthorizeDeleteStudentDocumentInput): AuthorizationResult {
  if (!principalAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang"
    }
  }

  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: "Elevnotatet er låst og kan ikke slettes"
    }
  }

  return authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber: document.school.schoolNumber })
}

export type AuthorizeDeleteGroupDocumentInput = {
  principalAccess: PrincipalAccess | null
  document: GroupDocument
}

export function authorizeDeleteGroupDocument({ principalAccess, document }: AuthorizeDeleteGroupDocumentInput): AuthorizationResult {
  if (!principalAccess) {
    return {
      authorized: false,
      message: "Ingen tilgang"
    }
  }
  
  if (document.isDocumentLocked) {
    return {
      authorized: false,
      message: "Gruppedokumentet er låst og kan ikke slettes"
    }
  }

  return authorizeSchoolLeaderForSchool({ principalAccess, schoolNumber: document.school.schoolNumber })
}
