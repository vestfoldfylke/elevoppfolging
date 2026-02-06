import type {
	AppStudent,
	ClassAutoAccessEntry,
	ContactTeacherGroupAutoAccessEntry,
	DocumentMessage,
	ProgramAreaManualAccessEntry,
	SchoolManualAccessEntry,
	StudentDocument,
	StudentManualAccessEntry,
	TeachingGroupAutoAccessEntry
} from "./db/shared-types"

export type SimpleAppStudent = Omit<AppStudent, "studentEnrollments" | "lastSynced" | "ssn">

export type AccessType = SchoolManualAccessEntry | ProgramAreaManualAccessEntry | StudentManualAccessEntry | ClassAutoAccessEntry | ContactTeacherGroupAutoAccessEntry | TeachingGroupAutoAccessEntry

export type StudentDocumentType = StudentDocument["type"]

export type DocumentMessageType = DocumentMessage["type"]
