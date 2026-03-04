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

export type FrontendOverviewStudent = Omit<FrontendStudent, "studentEnrollments">

export type FrontendOverviewStudentWithImportantStuff = FrontendOverviewStudent & {
  importantStuff: StudentImportantStuff | null
  lastActivityTimestamp: Date | null
}

export type FrontendStudentDetails = {
  mainSchool: SchoolInfo | null
  mainClassMembership: ClassMembership | null
  mainContactTeacherGroupMembership: ContactTeacherGroupMembership | null
  additionalSchools: SchoolInfo[]
}

export type AccessType =
  | SchoolManualAccessEntry
  | ProgramAreaManualAccessEntry
  | StudentManualAccessEntry
  | ClassAutoAccessEntry
  | ClassManualAccessEntry
  | ContactTeacherGroupAutoAccessEntry
  | TeachingGroupAutoAccessEntry

export type StudentAccessInfo = {
  accessTypes: AccessType[]
  studentDataSharingConsent: boolean
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
