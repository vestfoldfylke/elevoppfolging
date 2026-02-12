import type {
  AppStudent,
  ClassAutoAccessEntry,
  ContactTeacherGroupAutoAccessEntry,
  DocumentMessage,
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

export type DocumentMessageType = DocumentMessage["type"]
