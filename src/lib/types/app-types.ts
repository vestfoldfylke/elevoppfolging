import type { AuthenticatedPrincipal } from "./authentication"
import type {
  Access,
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

export type CachedFrontendStudent = FrontendStudent & FrontendStudentMainDetails & {
  enrollmentsWithinViewAccessWindow: EnrollmentWithinViewAccessWindow[]
}

export type CachedFrontendStudentFilter = {
  studentName?: string
  className?: string
  classSystemIds?: string[]
  contactTeacherName?: string
}

export type AccessEntry =
  | SchoolLeaderManualAccessEntry
  | ManageManualStudentsManualAccessEntry
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
  APP_USER_CACHE_MAX_AGE_MINUTES: number
  SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS: number
}

export type RootLayoutData = {
  APP_INFO: ApplicationInfo
  authenticatedPrincipal: AuthenticatedPrincipal
  principalAccess: PrincipalAccess | null
  studentCheckBoxes: StudentCheckBox[]
  schools: SchoolInfo[]
}

export type PeriodDetails = Period & {
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
  sortBy?: "studentName" | "className" | "contactTeacherName" | "lastActivity"
  sortDirection?: "ascending" | "descending"
  top?: number
}

