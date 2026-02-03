import type { ObjectId } from "mongodb"

/** Undervisningsforhold & Skoleressurs */
export type Teacher = {
	/** entra objectid knyttet til en bruker i Users-collection hvis læreren finnes der */
	entraUserId: string | null
	systemId: string
	feideName: string
	name: string
}

export type Group = {
	systemId: string
	name: string
}

export type GroupMembership = {
	systemId: string
	period: Period
}

/** Klasse */
export type ClassGroup = Group & {
	teachers: Teacher[]
}

/** Klassemedlemskap */
export type ClassMembership = GroupMembership & {
	classGroup: ClassGroup
}

/** Undervisningsgruppe */
export type TeachingGroup = Group & {
	teachers: Teacher[]
}

/** Undervisningsgruppemedlemskap */
export type TeachingGroupMembership = GroupMembership & {
	teachingGroup: TeachingGroup
}

/** Kontaktlærergruppe */
export type ContactTeacherGroup = Group & {
	teachers: Teacher[]
}

/** Kontaktlærergruppemedlemskap */
export type ContactTeacherGroupMembership = GroupMembership & {
	contactTeacherGroup: ContactTeacherGroup
}

export type School = {
	_id: string
	name: string
	schoolNumber: string
}

export type Period = {
	start: string | null
	end: string | null
	active: boolean
}

/** Elevforhold */
export type StudentEnrollment = {
	systemId: string
	classMemberships: ClassMembership[]
	teachingGroupMemberships: TeachingGroupMembership[]
	contactTeacherGroupMemberships: ContactTeacherGroupMembership[]
	period: Period
	school: School
	mainSchool: boolean
}

/** En elev i db for denne appen */
export type DbAppStudent = {
	_id: ObjectId
	/** FINT system-id for eleven */
	systemId: string
	/** Om eleven har et aktivt elevforhold */
	active: boolean
	studentNumber: string
	ssn: string
	name: string
	feideName: string
	studentEnrollments: StudentEnrollment[]
	lastSynced: string
}

export type NewDbAppStudent = Omit<DbAppStudent, "_id">

export type AccessEntryBase = {
	/** Hvilken skole gjelder tilgangen for */
	schoolNumber: string
	/** Hvem har gitt tilgangen */
	granted: {
		by: {
			_id: string
			name: string
		}
		at: string
	}
}

export type SchoolManualAccessEntry = AccessEntryBase & {
	type: "MANUELL-SKOLELEDER-TILGANG"
}

export type ProgramAreaManualAccessEntry = AccessEntryBase & {
	/** Entydig identifikator (db _id) for hvilket undervisningsområde det er gitt tilgang til */
	_id: string
	type: "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG"
}

export type StudentManualAccessEntry = AccessEntryBase & {
	/** FINT system-id for eleven det er gitt tilgang til */
	systemId: string
	type: "MANUELL-ELEV-TILGANG"
}

export type ClassAutoAccessEntry = AccessEntryBase & {
	/** FINT system-id for klassen det er gitt tilgang til */
	systemId: string
	type: "AUTOMATISK-KLASSE-TILGANG"
}

export type ContactTeacherGroupAutoAccessEntry = AccessEntryBase & {
	/** FINT system-id for undervisningsgruppen det er gitt tilgang til */
	systemId: string
	type: "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG"
}

export type TeachingGroupAutoAccessEntry = AccessEntryBase & {
	/** FINT system-id for undervisningsgruppen det er gitt tilgang til */
	systemId: string
	type: "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG"
}

export type DbAccess = {
	_id: ObjectId
	entraUserId: string
	name: string
	schools: SchoolManualAccessEntry[]
	programAreas: ProgramAreaManualAccessEntry[]
	classes: ClassAutoAccessEntry[]
	contactTeacherGroups: ContactTeacherGroupAutoAccessEntry[]
	teachingGroups: TeachingGroupAutoAccessEntry[]
	students: StudentManualAccessEntry[]
}

export type NewDbAccess = Omit<DbAccess, "_id">

export type DbAppUser = {
	_id: ObjectId
	feideName: string
	entra: {
		id: string
		userPrincipalName: string
		displayName: string
		companyName: string
		department: string
	}
}

export type NewDbAppUser = Omit<DbAppUser, "_id">
