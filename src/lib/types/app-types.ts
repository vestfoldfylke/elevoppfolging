import type {
	AppStudent,
	ClassAutoAccessEntry,
	ContactTeacherGroupAutoAccessEntry,
	ProgramAreaManualAccessEntry,
	SchoolManualAccessEntry,
	StudentManualAccessEntry,
	TeachingGroupAutoAccessEntry,
	StudentDocument,
	DocumentMessage
} from "./db/shared-types"

export type SimpleAppStudent = Omit<AppStudent, "studentEnrollments" | "lastSynced" | "ssn">

export type AccessType = SchoolManualAccessEntry | ProgramAreaManualAccessEntry | StudentManualAccessEntry | ClassAutoAccessEntry | ContactTeacherGroupAutoAccessEntry | TeachingGroupAutoAccessEntry

export type StudentDocumentType = StudentDocument["type"]

export type DocumentMessageType = DocumentMessage["type"]
