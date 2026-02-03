import type {
	ClassAutoAccessEntry,
	ContactTeacherGroupAutoAccessEntry,
	DbAccess,
	DbAppStudent,
	DbAppUser,
	ProgramAreaManualAccessEntry,
	SchoolManualAccessEntry,
	StudentManualAccessEntry,
	TeachingGroupAutoAccessEntry
} from "./db/db"
import type { DbProgramArea } from "./program-area"

export type AppStudent = Omit<DbAppStudent, "_id" | "ssn" | "lastSynced"> & {
	_id: string
}

export type SimpleAppStudent = Omit<AppStudent, "studentEnrollments">

export type Access = Omit<DbAccess, "_id"> & {
	_id: string
}

export type AppUser = Omit<DbAppUser, "_id"> & {
	_id: string
}

export type ProgramArea = Omit<DbProgramArea, "_id"> & {
	_id: string
}

export type AccessType = SchoolManualAccessEntry | ProgramAreaManualAccessEntry | StudentManualAccessEntry | ClassAutoAccessEntry | ContactTeacherGroupAutoAccessEntry | TeachingGroupAutoAccessEntry
