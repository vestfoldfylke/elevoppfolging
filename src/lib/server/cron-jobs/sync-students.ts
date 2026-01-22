/*
Må hente alle elever via FINT
- Hente alle elever fra FINT APIet
- Sjekke om eleven finnes i vår database
- Hvis ikke, opprette eleven med info fra FINT
- Hvis ja, oppdatere infoen hvis den har endret seg (f.eks. navn, epost, grupper, roller)

Kjøres f.eks. hver natt som en cron-jobb


Kan bruke et db-interface av noe slag
Skal vi lage et FINT-interface

*/

import { logger } from "@vestfoldfylke/loglady"
import { getDbClient } from "$lib/server/db/get-db-client"
import { getFintClient } from "$lib/server/fint/get-fint-client"
import type { Access, AppUser, ClassAutoAccessEntry, IDbClient, TeachingGroupAutoAccessEntry } from "$lib/types/db/db-client"
import type { IFintClient } from "$lib/types/fint/fint-client"
import type {
	Elev,
	Elevforhold,
	Identifikator,
	Klassemedlemskap,
	Kontaktlarergruppemedlemskap,
	Maybe,
	Periode,
	Person,
	Skole,
	Undervisningsforhold,
	Undervisningsgruppemedlemskap
} from "$lib/types/fint-types"
import type { AppStudent, ClassMembership, ContactTeacherGroupMembership, Period, School, StudentEnrollment, Teacher, TeachingGroupMembership } from "$lib/types/student"
import { log } from "node:console"

export class SyncStudents {
	private readonly appUsers: AppUser[]

	constructor(appUsers: AppUser[]) {
		this.appUsers = appUsers
	}

	private findUserByFeidename = (feidename: string): AppUser | null => {
		const user: AppUser | undefined = this.appUsers.find((appUser: AppUser) => appUser.feidenavn?.toLowerCase() === feidename.toLowerCase())
		return user || null
	}

	private getValidArray = <T, U>(input: Array<Maybe<T>> | (Maybe<Array<Maybe<T>>> | undefined), typeName: string, person: Person): U => {
		if (input === null || input === undefined) {
			logger.warn("Person med brukernavn {Username} har ingen {Type}", person.elev?.brukernavn || person.personalressurs?.brukernavn || "N/A", typeName)
			return [] as U
		}

		if (Array.isArray(input)) {
			return input.filter((item: Maybe<T>) => item !== null) as U
		}

		return input as U
	}

	private isActive = (start: string, slutt: string | null | undefined): boolean => {
		const now: Date = new Date()
		const startDate: Date = new Date(start)

		if (!slutt) {
			return now > startDate
		}

		const sluttDate: Date = new Date(slutt)
		return now > startDate && now < sluttDate
	}

	private repackPeriode = (periode: Maybe<Periode> | undefined): Period => {
		if (!periode) {
			return {
				start: null,
				end: null,
				active: false
			}
		}

		return {
			start: periode.start && `${periode.start.substring(0, 11)}00:00:00.000Z`,
			end: periode.slutt ? `${periode.start.substring(0, 11)}23:59:59.999Z` : null,
			active: this.isActive(periode.start, periode.slutt)
		}
	}

	private repackClassMemberships = (klassemedlemskap: Maybe<Maybe<Klassemedlemskap>[]> | undefined, person: Person): ClassMembership[] => {
		const validKlassemedlemskap: Klassemedlemskap[] = this.getValidArray<Klassemedlemskap, Klassemedlemskap[]>(klassemedlemskap, "klassemedlemskap", person)

		return validKlassemedlemskap.map((klassemedlemskap: Klassemedlemskap) => {
			return {
				systemId: klassemedlemskap.systemId.identifikatorverdi,
				period: this.repackPeriode(klassemedlemskap.gyldighetsperiode),
				class: {
					systemId: klassemedlemskap.systemId.identifikatorverdi,
					name: klassemedlemskap.klasse.navn,
					description: klassemedlemskap.klasse.beskrivelse,
					teachers: this.repackTeachingAssignments(klassemedlemskap.klasse.undervisningsforhold, person)
				}
			}
		})
	}

	private repackTeachingGroupMemberships = (undervisningsgruppemedlemskap: Maybe<Maybe<Undervisningsgruppemedlemskap>[]> | undefined, person: Person): TeachingGroupMembership[] => {
		const validUndervisningsgruppemedlemskap: Undervisningsgruppemedlemskap[] = this.getValidArray<Undervisningsgruppemedlemskap, Undervisningsgruppemedlemskap[]>(
			undervisningsgruppemedlemskap,
			"undervisningsgruppemedlemskap",
			person
		)

		return validUndervisningsgruppemedlemskap.map((undervisningsgruppemedlemskap: Undervisningsgruppemedlemskap) => {
			return {
				systemId: undervisningsgruppemedlemskap.systemId.identifikatorverdi,
				period: this.repackPeriode(undervisningsgruppemedlemskap.gyldighetsperiode),
				teachingGroup: {
					systemId: undervisningsgruppemedlemskap.systemId.identifikatorverdi,
					name: undervisningsgruppemedlemskap.undervisningsgruppe.navn,
					description: undervisningsgruppemedlemskap.undervisningsgruppe.beskrivelse,
					teachers: this.repackTeachingAssignments(undervisningsgruppemedlemskap.undervisningsgruppe.undervisningsforhold, person)
				}
			}
		})
	}

	private repackContactTeacherGroupMemberships = (kontaktlarergruppemedlemskap: Maybe<Maybe<Kontaktlarergruppemedlemskap>[]> | undefined, person: Person): ContactTeacherGroupMembership[] => {
		const validKontaktlarergruppemedlemskap: Kontaktlarergruppemedlemskap[] = this.getValidArray<Kontaktlarergruppemedlemskap, Kontaktlarergruppemedlemskap[]>(
			kontaktlarergruppemedlemskap,
			"kontaktlarergruppemedlemskap",
			person
		)

		return validKontaktlarergruppemedlemskap.map((kontaktlarergruppemedlemskap: Kontaktlarergruppemedlemskap) => {
			return {
				systemId: kontaktlarergruppemedlemskap.systemId.identifikatorverdi,
				period: this.repackPeriode(kontaktlarergruppemedlemskap.gyldighetsperiode),
				contactTeacherGroup: {
					systemId: kontaktlarergruppemedlemskap.systemId.identifikatorverdi,
					name: kontaktlarergruppemedlemskap.kontaktlarergruppe.navn,
					description: kontaktlarergruppemedlemskap.kontaktlarergruppe.beskrivelse,
					teachers: this.repackTeachingAssignments(kontaktlarergruppemedlemskap.kontaktlarergruppe.undervisningsforhold, person)
				}
			}
		})
	}

	private repackSchool = (skole: Skole): School => {
		return {
			_id: "",
			name: skole.navn,
			systemId: skole.systemId.identifikatorverdi,
			schoolNumber: skole.skolenummer.identifikatorverdi
		}
	}

	private repackTeachingAssignments = (undervisningsforhold: Maybe<Maybe<Undervisningsforhold>[]> | undefined, person: Person): Teacher[] => {
		const validUndervisningsforhold: Undervisningsforhold[] = this.getValidArray<Undervisningsforhold, Undervisningsforhold[]>(undervisningsforhold, "undervisningsforhold", person)

		const undervisningsforholdWithTeacher = validUndervisningsforhold.filter((undervisningsforhold: Undervisningsforhold) => {
			if (!undervisningsforhold.skoleressurs.feidenavn || !undervisningsforhold.skoleressurs.feidenavn.identifikatorverdi) {
				logger.warn("Undervisningsforhold med systemId {SystemId} har ingen skoleressurs med feidenavn tilknyttet, hopper over", undervisningsforhold.systemId.identifikatorverdi)
				return false
			}
			return true
		})

		return undervisningsforholdWithTeacher.map((undervisningsforhold: Undervisningsforhold) => {
			const feidename: string = (undervisningsforhold.skoleressurs.feidenavn as Identifikator).identifikatorverdi // Den er vel sjekka rett over vel
			const firstName: string = undervisningsforhold.skoleressurs.person?.navn.fornavn || "Ukjent fornavn"
			const lastName: string = undervisningsforhold.skoleressurs.person?.navn.etternavn || "Ukjent etternavn"
			const appUserId: string | null = this.findUserByFeidename(feidename)?.feidenavn || null
			return {
				_id: appUserId,
				feidename,
				name: `${firstName} ${lastName}`,
				systemId: undervisningsforhold.skoleressurs.systemId.identifikatorverdi
			}
		})
	}

	public syncStudentsAndAccess = async (): Promise<void> => {
		const fintClient: IFintClient = getFintClient()
		const students: Elev[] = await fintClient.getStudents()
		const appStudents: AppStudent[] = []
    const dbClient: IDbClient = getDbClient()
    const existingAccess: Access[] = await dbClient.getAccess()
    logger.info("Hentet eksisterende tilgangsdata ({Count} dokumenter) fra database - wiper all automatisk tilgang her in-memory, før vi fyller det opp igjen", existingAccess.length)

    existingAccess.forEach((access: Access) => {
      access.classes = access.classes.filter((entry) => entry.type !== "AUTOMATISK-KLASSE-TILGANG")
      access.teachingGroups = access.teachingGroups.filter((entry) => entry.type !== "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG")
    })

		for (const student of students) {
			if (!student.elevforhold || student.elevforhold.length === 0) {
				logger.warn("Elev {DisplayName} har ingen elevforhold, hopper over", student.person.navn.fornavn)
				continue
			}

      if (!student.systemId || !student.systemId.identifikatorverdi) {
				logger.error("Elev {DisplayName} har ingen systemId, hopper over", student.person.navn.fornavn)
				continue
			}

			if (!student.elevnummer || !student.elevnummer.identifikatorverdi) {
				logger.error("Elev {DisplayName} har ingen elevnummer, hopper over", student.person.navn.fornavn)
				continue
			}

			if (!student.feidenavn || !student.feidenavn.identifikatorverdi) {
				logger.error("Elev {DisplayName} har ingen feidenavn, hopper over", student.person.navn.fornavn)
				continue
			}

			const validElevforhold: Elevforhold[] = student.elevforhold.filter((elevforhold: Maybe<Elevforhold>) => elevforhold !== null)
			if (validElevforhold.length === 0) {
				logger.warn("Elev {DisplayName} har ingen gyldige elevforhold, hopper over", student.person.navn.fornavn)
				continue
			}

			logger.info("Døtter inn denne elevkødden: {DisplayName}", student.person.navn.fornavn)

			const elevforholder: StudentEnrollment[] = validElevforhold.map((elevforhold: Elevforhold) => {
				const classMemberships: ClassMembership[] = this.repackClassMemberships(elevforhold.klassemedlemskap, student.person)
				const teachingGroupMemberships: TeachingGroupMembership[] = this.repackTeachingGroupMemberships(elevforhold.undervisningsgruppemedlemskap, student.person)
				const contactTeacherGroupMemberships: ContactTeacherGroupMembership[] = this.repackContactTeacherGroupMemberships(elevforhold.kontaktlarergruppemedlemskap, student.person)
				const periode: Period = this.repackPeriode(elevforhold.gyldighetsperiode)
				const school: School = this.repackSchool(elevforhold.skole)
				const mainSchool: boolean = Boolean(elevforhold.hovedskole)

        logger.info("Oppdaterer lærer-tilganger for elev {StudentName}", student.person.navn.fornavn)
        const upsertTeacherAccess = (teacher: Teacher, accessEntry: ClassAutoAccessEntry | TeachingGroupAutoAccessEntry): void => {
          if (!teacher._id) {
            logger.warn("Kan ikke oppdatere tilgang for lærer {TeacherName} uten app-bruker-id", teacher.name)
            return
          }
          let teacherAccess: Access | undefined = existingAccess.find((access: Access) => access.userId === teacher._id)
          if (!teacherAccess) {
            teacherAccess = {
              _id: "",
              userId: teacher._id,
              name: teacher.name,
              schools: [],
              programAreas: [],
              classes: [],
              teachingGroups: [],
              students: []
            }
            existingAccess.push(teacherAccess)
          }
          if (accessEntry.type === "AUTOMATISK-KLASSE-TILGANG") {
            const alreadyHasClassAccess = teacherAccess.classes.some((entry) => entry.systemId === accessEntry.systemId)
            if (!alreadyHasClassAccess) {
              teacherAccess.classes.push(accessEntry)
              logger.info("La til automatisk klasse-tilgang for lærer {TeacherName} til klasse {ClassId}", teacher.name, accessEntry.systemId)
            }
            return
          }
          if (accessEntry.type === "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG") {
            const alreadyHasTeachingGroupAccess = teacherAccess.teachingGroups.some((entry) => entry.systemId === accessEntry.systemId)
            if (!alreadyHasTeachingGroupAccess) {
              teacherAccess.teachingGroups.push(accessEntry)
              logger.info("La til automatisk undervisningsgruppe-tilgang for lærer {TeacherName} til undervisningsgruppe {TeachingGroupId}", teacher.name, accessEntry.systemId)
            }
            return
          }
        }

        // Går gjennom klassemedlemskap for å oppdatere lærer-tilganger - deretter undervisningsgruppemedlemskap
        for (const classMembership of classMemberships) {
          for (const teacher of classMembership.class.teachers) {
            const accessEntry: ClassAutoAccessEntry = {
              systemId: classMembership.class.systemId,
              schoolNumber: school.schoolNumber,
              type: "AUTOMATISK-KLASSE-TILGANG",
              granted: {
                by: {
                  _id: "SYSTEM",
                  name: "SYNC JOB"
                },
                at: new Date().toISOString()
              }
            }
            upsertTeacherAccess(teacher, accessEntry)
          }
        }
        for (const teachingGroupMembership of teachingGroupMemberships) {
          for (const teacher of teachingGroupMembership.teachingGroup.teachers) {
            const accessEntry: TeachingGroupAutoAccessEntry = {
              systemId: teachingGroupMembership.teachingGroup.systemId,
              schoolNumber: school.schoolNumber,
              type: "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG",
              granted: {
                by: {
                  _id: "SYSTEM",
                  name: "SYNC JOB"
                },
                at: new Date().toISOString()
              }
            }
            upsertTeacherAccess(teacher, accessEntry)
          }
        }

				return {
					_id: "",
					classMemberships,
					teachingGroupMemberships,
					contactTeacherGroupMemberships,
					period: periode,
					mainSchool,
					school
				}
			})

			appStudents.push({
				_id: "",
        systemId: student.systemId.identifikatorverdi,
				studentNumber: student.elevnummer.identifikatorverdi,
				feidename: student.feidenavn.identifikatorverdi,
				ssn: student.person.fodselsnummer.identifikatorverdi,
				name: `${student.person.navn.fornavn} ${student.person.navn.mellomnavn ? `${student.person.navn.mellomnavn} ` : ""}${student.person.navn.etternavn}`,
				studentEnrollments: elevforholder
			})
		}

		await dbClient.replaceStudents(appStudents)
    await dbClient.replaceAccess(existingAccess)
	}
}
