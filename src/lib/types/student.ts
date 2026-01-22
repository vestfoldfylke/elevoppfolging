export type Teacher = {
	_id: string
	feidenavn: string
	navn: string
}

/** Undervisningsforhold */
export type TeachingRelation = {
	larer: Teacher
	systemId: string
}

/** Basisgruppe */
export type Class = {
	beskrivelse: string
	navn: string
	periode: Period
	systemId: string
	undervisningsforhold: TeachingRelation[]
}

/** Undervisningsgruppe */
export type TeachingGroup = {
	beskrivelse: string
	navn: string
	periode: Period
	systemId: string
	undervisningsforhold: TeachingRelation[]
}

export type School = {
	_id: string
	hovedskole?: boolean
	navn: string
	skolenummer: string
}

export type Period = {
	start: string | null,
	slutt: string | null,
	aktiv: boolean
}

export type StudentRelation = {
	_id: string
	klasser: Class[]
	kontaktlarere: Teacher[]
	periode: Period
	skole: School
	undervisningsgrupper: TeachingGroup[]
}

export type AppStudent = {
	_id: string
	elevforhold: StudentRelation[]
	elevnummer: string
	fodselsnummer: string
	navn: string
}
