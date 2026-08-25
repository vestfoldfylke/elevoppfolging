import type { AuthenticatedPrincipal } from "./authentication"
import type {
  Access,
  AllStudentsAtSchoolsManualAccessEntry,
  AppStudent,
  AppUser,
  ClassAutoAccessEntry,
  ClassGroup,
  ClassManualAccessEntry,
  ClassMembership,
  ContactTeacherGroup,
  ContactTeacherGroupAutoAccessEntry,
  ContactTeacherGroupMembership,
  ManageManualStudentsManualAccessEntry,
  ManualAccessEntryInput,
  Period,
  ProgramAreaManualAccessEntry,
  SchoolInfo,
  SchoolLeaderManualAccessEntry,
  Source,
  StudentCheckBox,
  StudentDocument,
  StudentImportantStuff,
  StudentManualAccessEntry,
  TeachingGroup,
  TeachingGroupAutoAccessEntry,
  TeachingGroupMembership
} from "./db/shared-types"

export type FrontendStudent = Omit<AppStudent, "ssn">

export type EnrollmentWithinViewAccessWindow = {
  systemId: string
  mainSchool: boolean
  school: SchoolInfo
  period: PeriodDetails
  classMemberships: (Omit<ClassMembership, "period"> & { period: PeriodDetails })[]
  contactTeacherGroupMemberships: (Omit<ContactTeacherGroupMembership, "period"> & { period: PeriodDetails })[]
  teachingGroupMemberships: (Omit<TeachingGroupMembership, "period"> & { period: PeriodDetails })[]
  source: Source
}

export type EnrollmentDetails = {
  period: PeriodDetails
  school: SchoolInfo
  classGroups: ClassGroup[]
  contactTeacherGroup: ContactTeacherGroup | null
  teachingGroups: TeachingGroup[]
}

export type FrontendStudentMainDetails = {
  mainSchool: SchoolInfo | null
  mainClass: ClassGroup | null
  mainContactTeacherGroup: ContactTeacherGroup | null
}

export type CachedFrontendStudent = FrontendStudent &
  FrontendStudentMainDetails & {
    enrollmentsWithinViewAccessWindow: EnrollmentWithinViewAccessWindow[]
  }

export type CachedFrontendStudentFilter = {
  studentName?: string
  className?: string
  classSystemIds?: string[]
  contactTeacherName?: string
  schoolNumbers?: string[]
}

export type AccessEntry =
  | SchoolLeaderManualAccessEntry
  | ManageManualStudentsManualAccessEntry
  | AllStudentsAtSchoolsManualAccessEntry
  | ProgramAreaManualAccessEntry
  | StudentManualAccessEntry
  | ClassAutoAccessEntry
  | ClassManualAccessEntry
  | ContactTeacherGroupAutoAccessEntry
  | TeachingGroupAutoAccessEntry

export type ProgramAreaPrincipalAccess = ProgramAreaManualAccessEntry & { name: string; classSystemIds: string[] }

export type PrincipalAccess = Omit<Access, "programAreas"> & {
  programAreas: ProgramAreaPrincipalAccess[]
}

export type PrincipalAccessForStudent = {
  type: AccessEntry["type"]
  schoolNumber: string
  accessThroughResource: {
    id: string
    name: string
  } | null
  source: Source
}

/** Student which a given principal has access to, along with which access types principal has to the student */
export type PrincipalAccessStudent = Omit<CachedFrontendStudent, "studentEnrollments" | "systemId" | "studentNumber" | "created" | "modified"> & {
  principalAccessForStudent: PrincipalAccessForStudent[]
}

export type FrontendOverviewStudent = PrincipalAccessStudent & {
  importantStuff: StudentImportantStuff[]
  lastActivityTimestamp: Date | null
  dataSharingConsent: boolean
}

export type FrontendOverviewStudentResponse = {
  students: FrontendOverviewStudent[]
  totalStudentCount: number
}

export type ApplicationInfo = {
  NAME: string
  VERSION: string
  ENVIRONMENT: string
  ROLES: {
    EMPLOYEE: string
    ADMIN: string
    METRICS: string
  }
  STUDENT_ACCESS_BEFORE_ACTIVE_DAYS: number
  STUDENT_ACCESS_AFTER_EXPIRE_DAYS: number
  STUDENT_CACHE_MAX_AGE_MINUTES: number
  STUDENT_OVERVIEW_TOP: number
  APP_USER_CACHE_MAX_AGE_MINUTES: number
  SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS: number
  BANNER_INFO_MESSAGE?: string
  BANNER_ENVIRONMENT_MESSAGE?: string
  STUDENT_DATA_SHARING_CONSENT_LINK: string
}

export type DocumentTemplateFilterOption = {
  _id: string
  name: string
}

export type RootLayoutData = {
  APP_INFO: ApplicationInfo
  authenticatedPrincipal: AuthenticatedPrincipal
  principalAccess: PrincipalAccess | null
  documentTemplateFilterOptions: DocumentTemplateFilterOption[]
  studentCheckBoxes: StudentCheckBox[]
  schools: SchoolInfo[]
}

export type PeriodDetails = Period & {
  isNull: boolean
  active: boolean
  daysAfterExpired: number | null
  daysUntilActive: number | null
  withinViewAccessWindow: boolean
}

export type StudentUnavailableSchoolDocuments = {
  school: SchoolInfo
  numberOfDocuments: number
}

export type CachedAppUser = AppUser

export type StudentMemberships = {
  schoolNumbers: string[]
  classes: { schoolNumber: string; systemId: string }[]
  contactTeacherGroups: { schoolNumber: string; systemId: string }[]
  teachingGroups: { schoolNumber: string; systemId: string }[]
}

export type StudentAccessPerson = {
  entra: {
    id: string
    userPrincipalName: string
    displayName: string
  }
  principalAccessForStudent: PrincipalAccessForStudent[]
}

export type NewManualAccessControl = {
  type: ManualAccessEntryInput["type"]
  name: string
  open: boolean
  form: HTMLFormElement | undefined
  entraUserId: string
  programAreaId?: string
  classId?: string
  studentId?: string
}

export type TemplateInfo = {
  id: string
  name: string
}

export type FrontendOverviewStudentFilter = Omit<CachedFrontendStudentFilter, "sortBy"> & {
  studentCheckBoxIds?: string[]
  templateIds?: string[]
  hasNoDocuments?: boolean
  sortBy?: "studentName" | "className" | "contactTeacherName" | "lastActivity"
  sortDirection?: "ascending" | "descending"
  top?: number
}

export type AccessControlAppUser = {
  entraUserId: string
  displayName: string
  companyName: string
}

export type AccessControlStudent = {
  _id: string
  name: string
  feideName: string
}

export type AccessControlClass = {
  systemId: string
  name: string
}

export type SchoolAdministrationManualStudent = {
  _id: string
  name: string
  feideName: string
  hasBlockedAddress?: boolean
  source: Source
  manualEnrollments: EnrollmentWithinViewAccessWindow[]
}

export type SuggestionSelectItem = {
  label: string
  value: string
}

export type FrontendStudentDocument = StudentDocument & {
  isDocumentContentHidden: boolean
}

export type ManualStudentCreateOrReactivate = {
  student: FrontendStudent | null
  type: "CREATE" | "REACTIVATE" | "ADD_MANUAL_ENROLLMENT"
  allowed: boolean
  message?: string
}
