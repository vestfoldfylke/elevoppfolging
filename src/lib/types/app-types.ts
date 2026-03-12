import type { AuthenticatedPrincipal } from "./authentication"
import type {
  AppStudent,
  ClassAutoAccessEntry,
  ClassManualAccessEntry,
  ClassMembership,
  ContactTeacherGroupAutoAccessEntry,
  ContactTeacherGroupMembership,
  Period,
  ProgramAreaManualAccessEntry,
  SchoolInfo,
  SchoolManualAccessEntry,
  StudentImportantStuff,
  StudentManualAccessEntry,
  TeachingGroupAutoAccessEntry
} from "./db/shared-types"

export type FrontendStudent = Omit<AppStudent, "ssn">

export type FrontendStudentDetails = {
  mainSchool: SchoolInfo | null
  mainClassMembership: ClassMembership | null
  mainContactTeacherGroupMembership: ContactTeacherGroupMembership | null
  additionalSchools: SchoolInfo[]
}

export type CachedFrontendStudent = FrontendStudent & FrontendStudentDetails

export type AccessEntry =
  | SchoolManualAccessEntry
  | ProgramAreaManualAccessEntry
  | StudentManualAccessEntry
  | ClassAutoAccessEntry
  | ClassManualAccessEntry
  | ContactTeacherGroupAutoAccessEntry
  | TeachingGroupAutoAccessEntry

export type CachedFrontendStudentWithAccessInfo = CachedFrontendStudent & {
  accessTypes: AccessEntry[]
}

export type FrontendOverviewStudent = Omit<CachedFrontendStudentWithAccessInfo, "studentEnrollments"> & {
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
  }
  STUDENT_ACCESS_BEFORE_ACTIVE_DAYS: number
  STUDENT_ACCESS_AFTER_EXPIRE_DAYS: number
  STUDENT_CACHE_MAX_AGE_MINUTES: number
}

export type RootLayoutData = {
  APP_INFO: ApplicationInfo
  authenticatedPrincipal: AuthenticatedPrincipal
}

export type PeriodDetails = Period & {
  active: boolean
  daysUntilExpire: number | null
  daysUntilActive: number | null
  withinViewAccessWindow: boolean
}

export type StudentUnavailableSchoolDocuments = {
  school: SchoolInfo
  numberOfDocuments: number
}
