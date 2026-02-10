import type {
	AppStudent,
	ClassAutoAccessEntry,
	ContactTeacherGroupAutoAccessEntry,
	DocumentMessage,
	ProgramAreaManualAccessEntry,
	SchoolManualAccessEntry,
	StudentDocument,
	StudentImportantStuff,
	StudentManualAccessEntry,
	TeachingGroupAutoAccessEntry
} from "./db/shared-types"

export type FrontendStudent = Omit<AppStudent, "lastSynced" | "ssn"> & {
	importantStuff: StudentImportantStuff | null
}

export type FrontendOverviewStudent = Omit<FrontendStudent, "studentEnrollments">

export type AccessType = SchoolManualAccessEntry | ProgramAreaManualAccessEntry | StudentManualAccessEntry | ClassAutoAccessEntry | ContactTeacherGroupAutoAccessEntry | TeachingGroupAutoAccessEntry

export type StudentDocumentType = StudentDocument["type"]

export type DocumentMessageType = DocumentMessage["type"]
