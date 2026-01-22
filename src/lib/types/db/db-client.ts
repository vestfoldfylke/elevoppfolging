import type { AppStudent } from "$lib/types/student"

export type ManualAccessEntryBase = {
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

export type AutoAccessEntryBase = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** Når ble tilgangen automatisk gitt (ved synk mot FINT) */
  granted: {
    by: {
      _id: "SYSTEM",
      name: "SYNC JOB"
    }
    at: string
  }
}

export type SchoolManualAccessEntry =  ManualAccessEntryBase & {
  type: "MANUELL-SKOLELEDER-TILGANG"
}

export type ProgramAreaManualAccessEntry = ManualAccessEntryBase & {
  /** Entydig identifikator (db _id) for hvilket undervisningsområde det er gitt tilgang til */
  _id: string
  type: "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG"
}

export type ClassManualAccessEntry = ManualAccessEntryBase & {
  /** FINT system-id for klassen det er gitt tilgang til */
  systemId: string
  type: "MANUELL-KLASSE-TILGANG"
}

export type TeachingGroupManualAccessEntry = ManualAccessEntryBase & {
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "MANUELL-UNDERVISNINGSGRUPPE-TILGANG"
}

export type StudentManualAccessEntry = ManualAccessEntryBase & {
  /** FINT system-id for eleven det er gitt tilgang til */
  systemId: string
  type: "MANUELL-ELEV-TILGANG"
}

export type ClassAutoAccessEntry = AutoAccessEntryBase & {
  /** FINT system-id for klassen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-KLASSE-TILGANG"
}

export type TeachingGroupAutoAccessEntry = AutoAccessEntryBase & {
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG"
}

export type Access = {
	_id: string
	userId: string
	name: string
  schools: SchoolManualAccessEntry[]
  programAreas: ProgramAreaManualAccessEntry[]
	classes: (ClassManualAccessEntry | ClassAutoAccessEntry)[]
	teachingGroups: (TeachingGroupManualAccessEntry | TeachingGroupAutoAccessEntry)[]
	students: StudentManualAccessEntry[]
}

export type AppUser = {
	_id: string
	feidenavn?: string
	entra: {
		id: string
		userPrincipalName: string
		displayName: string
		companyName: string
		department: string
	}
}

export interface IDbClient {
	getStudents: () => Promise<AppStudent[]>
	replaceStudents: (students: AppStudent[]) => Promise<void>
	replaceUsers: (users: AppUser[]) => Promise<void>
  getAccess: () => Promise<Access[]>
  replaceAccess: (accesses: Access[]) => Promise<void>
}

/*
 * students/ (GET)
 *   - Hente pålogget bruker (objectId)
 *   - Hente access for pålogget bruker (objectId === userId)
 *   - Hente alle elever basert på access for pålogget bruker
 *       { elevforhold.basisgruppe.systemId.identifikatorverdi IN access.classes.resourceId OR elevforhold.teachingRelation.systemId IN access.teachingGroup.resourceId OR elevforhold._id IN access.students.resourceId }
 *  - Returnere elever
 *
 * getStudents/id/ (GET)
 *  - Hente pålogget bruker
 *  - Hente access for pålogget bruker
 *  - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
 *  - Hvis ja, returnere elev med hvem som kan oppfølge denne
 *  - Hvis nei, returnere 403
 *
 * getStudents/id/note (GET)
 *  - Hente pålogget bruker
 *  - Hente access for pålogget bruker
 *  - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
 *  - Hente notater som lærer har tilgang til (author eller en annen rolle enn lærer)
 *  - Returnere notater (kun tittel)
 *
 * getStudents/id/note/id (GET / POST / DELETE)
 *   - GET
 *     - Hente pålogget bruker
 *     - Hente access for pålogget bruker
 *     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
 *     - Hente notat basert på id (sjekke at pålogget bruker er author eller har en annen rolle enn lærer)
 *     - Returnere notat (tittel og innhold)
 *   - POST
 *     - Hente pålogget bruker
 *     - Hente access for pålogget bruker
 *     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
 *     - Opprette notat
 *       - Sette pålogget bruker som author
 *       - Eventuelt om det er låst for innsyn av andre lærere
 *   - DELETE
 *     - Hente pålogget bruker
 *     - Hente access for pålogget bruker
 *     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
 *     - Sjekke at pålogget brukers rolle har tilgang til å slette notatet
 *     - Slette notat
 *
 * - Skal vi ha en slett alle notater for en elev? for en skole?
 * */
