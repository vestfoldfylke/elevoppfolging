import type { AuthenticatedPrincipal } from "./authentication"
import type {
  AppStudent,
  ClassAutoAccessEntry,
  ContactTeacherGroupAutoAccessEntry,
  ProgramAreaManualAccessEntry,
  SchoolManualAccessEntry,
  StudentImportantStuff,
  StudentManualAccessEntry,
  TeachingGroupAutoAccessEntry
} from "./db/shared-types"

export type FrontendStudent = Omit<AppStudent, "lastSynced" | "ssn">

export type FrontendOverviewStudent = Omit<FrontendStudent, "studentEnrollments"> & {
  importantStuff: StudentImportantStuff | null
}

export type AccessType = SchoolManualAccessEntry | ProgramAreaManualAccessEntry | StudentManualAccessEntry | ClassAutoAccessEntry | ContactTeacherGroupAutoAccessEntry | TeachingGroupAutoAccessEntry

export type ApplicationInfo = {
  NAME: string
  VERSION: string
  ENVIRONMENT: string
  ROLES: {
    EMPLOYEE: string
    ADMIN: string
  }
}

export type RootLayoutData = {
  APP_INFO: ApplicationInfo
  authenticatedPrincipal: AuthenticatedPrincipal
}
