/** Undervisningsforhold & Skoleressurs */
export type Teacher = {
	/** _id knyttet til en bruker i Users-collection hvis læreren finnes der */
	_id: string | null
	systemId: string
	feideName: string
	name: string
}

export type Group = {
	systemId: string
	description: string
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
	systemId: string
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
	_id: string
	classMemberships: ClassMembership[]
	teachingGroupMemberships: TeachingGroupMembership[]
	contactTeacherGroupMemberships: ContactTeacherGroupMembership[]
	period: Period
	school: School
	mainSchool: boolean
}

/** En elev i db for denne appen */
export type AppStudent = {
	_id: string
	/** FINT system-id for eleven */
	systemId: string
	studentNumber: string
	ssn: string
	name: string
	feideName: string
	studentEnrollments: StudentEnrollment[]
}
