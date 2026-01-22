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

import type {Access, AppUser, IDbClient} from "$lib/types/db/db-client";
import {logger} from "@vestfoldfylke/loglady";
import {getDbClient} from "$lib/server/db/get-db-client";
import type {IFintClient} from "$lib/types/fint/fint-client";
import {getFintClient} from "$lib/server/fint/get-fint-client";
import type {Basisgruppe, Elev, Elevforhold, Kontaktlarergruppe, Maybe, Periode, Person, Skole, Undervisningsforhold} from "$lib/types/fint-types";
import type {Period, AppStudent, Class, School, StudentRelation, Teacher, TeachingGroup, TeachingRelation} from "$lib/types/student";

export class SyncStudents {
  private readonly appUsers: AppUser[];

  constructor(appUsers: AppUser[]) {
    this.appUsers = appUsers
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

  private repackClasses = (basisgruppe: Maybe<Maybe<Basisgruppe>[]> | undefined, person: Person): Class[] => {
    const validBasisgrupper: Basisgruppe[] = this.getValidArray<Basisgruppe, Basisgruppe[]>(basisgruppe, "basisgruppe", person)

    return validBasisgrupper.map((basisgruppe: Basisgruppe) => {
      return {
        beskrivelse: basisgruppe.beskrivelse,
        navn: basisgruppe.navn,
        periode: this.repackPeriode(basisgruppe.periode)
        systemId: basisgruppe.systemId.identifikatorverdi,
        undervisningsforhold: this.repackTeachingRelation(basisgruppe.undervisningsforhold, person)
      }
    })
  }

  private repackPeriode = (periode: Maybe<Periode> | undefined): Period => {
    if (!periode) {
      return {
        start: null,
        slutt: null,
        aktiv: false
      }
    }

    return {
      start: periode.start && `${periode.start.substring(0, 11)}00:00:00.000Z`,
      slutt: periode.slutt ? `${periode.start.substring(0, 11)}23:59:59.999Z` : null,
      aktiv: this.isActive(periode.start, periode.slutt)
    }
  }

  private repackSchool = (skole: Skole): School => {
    return {
      _id: "",
      hovedskole: true, // TODO: hvor finne dette hen da?
      navn: skole.navn,
      skolenummer: skole.skolenummer.identifikatorverdi
    }
  }

  private repackTeachers = (kontaktlarergruppe: Maybe<Maybe<Kontaktlarergruppe>[]> | undefined, person: Person): Teacher[] => {
    const validKontaktlarergrupper: Kontaktlarergruppe[] = this.getValidArray<Kontaktlarergruppe, Kontaktlarergruppe[]>(kontaktlarergruppe, "kontaktlarergruppe", person)

    return validKontaktlarergrupper.map((kontaktlarergruppe: Kontaktlarergruppe) => {
      return {
        _id: "",
        feidenavn: "🤷‍♂️",
        navn: kontaktlarergruppe.navn
      }
    })
  }

  private repackTeachingRelation = (undervisningsforhold: Maybe<Maybe<Undervisningsforhold>[]> | undefined, person: Person): TeachingRelation[] => {
    const validUndervisningsforhold: Undervisningsforhold[] = this.getValidArray<Undervisningsforhold, Undervisningsforhold[]>(undervisningsforhold, "undervisningsforhold", person)
    
    const undervisningsforholdWithTeacher = validUndervisningsforhold.filter((undervisningsforhold: Undervisningsforhold) => {
      if (!undervisningsforhold.skoleressurs.feidenavn || !undervisningsforhold.skoleressurs.feidenavn.identifikatorverdi) {
        logger.warn("Undervisningsforhold med systemId {SystemId} har ingen skoleressurs med feidenavn tilknyttet, hopper over", undervisningsforhold.systemId.identifikatorverdi)
        return false
      }

      return true
    })

    return undervisningsforholdWithTeacher.map((undervisningsforhold: Undervisningsforhold) => {
      const teacher: AppUser | undefined = this.appUsers.find((appUser: AppUser) => appUser.feidenavn === undervisningsforhold.skoleressurs.feidenavn?.identifikatorverdi)
      if (!teacher) {
        // NOTE: this won't happen due to the filter above, but keeping for safety
        logger.error("Finner ikke lærer med feidenavn {Feidenavn} for undervisningsforhold med systemId {SystemId}", undervisningsforhold.skoleressurs.feidenavn?.identifikatorverdi, undervisningsforhold.systemId.identifikatorverdi)
        return {
          larer: {
            _id: "",
            feidenavn: "🤷‍♂️",
            navn: "N/A"
          },
          systemId: undervisningsforhold.systemId.identifikatorverdi
        }
      }

      return {
        larer: {
          _id: teacher._id,
          feidenavn: teacher.feidenavn || "🤷‍♂️",
          navn: teacher.entra.displayName
        },
        systemId: undervisningsforhold.systemId.identifikatorverdi
      }
    })
  }
  
  private repackTeachingRelations = (basisgruppe: Maybe<Maybe<Basisgruppe>[]> | undefined, person: Person): TeachingGroup[] => {
    // TODO: implement
    return []
  }

  public syncStudents = async (): Promise<void> => {
    const fintClient: IFintClient = getFintClient()
    const students: Elev[] = await fintClient.getStudents()
    const appStudents: AppStudent[] = []
    const teacherAccess: Map<string, Access> = new Map<string, Access>()

    for (const student of students) {
      if (!student.elevforhold || student.elevforhold.length === 0) {
        logger.warn("Elev {DisplayName} har ingen elevforhold, hopper over", student.person.navn.fornavn)
        continue
      }

      if (!student.elevnummer || !student.elevnummer.identifikatorverdi) {
        logger.error("Elev {DisplayName} har ingen elevnummer, hopper over", student.person.navn.fornavn)
        continue
      }

      const validElevforhold: Elevforhold[] = student.elevforhold.filter((elevforhold: Maybe<Elevforhold>) => elevforhold !== null)
      if (validElevforhold.length === 0) {
        logger.warn("Elev {DisplayName} har ingen gyldige elevforhold, hopper over", student.person.navn.fornavn)
        continue
      }

      logger.info("Døtter inn denne elevkødden: {DisplayName}", student.person.navn.fornavn)

      const elevforholder: StudentRelation[] = validElevforhold.map((elevforhold: Elevforhold) => {
        const klasser: Class[] = this.repackClasses(elevforhold.basisgruppe, student.person)
        const kontaktlarere: Teacher[] = this.repackTeachers(elevforhold.kontaktlarergruppe, student.person)
        const undervisningsgrupper: TeachingGroup[] = this.repackTeachingRelations(elevforhold.basisgruppe, student.person)
        const skole: School = this.repackSchool(elevforhold.skole)
        const periode: Period = this.repackPeriode(elevforhold.gyldighetsperiode)
        
        return {
          _id: "",
          klasser,
          kontaktlarere,
          periode,
          undervisningsgrupper,
          skole
        }
      })

      appStudents.push({
        _id: "",
        elevforhold: elevforholder,
        elevnummer: student.elevnummer.identifikatorverdi,
        fodselsnummer: student.person.fodselsnummer.identifikatorverdi,
        navn: `${student.person.navn.fornavn} ${student.person.navn.mellomnavn ? `${student.person.navn.mellomnavn} ` : ""}${student.person.navn.etternavn}`
      })
    }

    const dbClient: IDbClient = getDbClient()
    await dbClient.replaceStudents(appStudents)
  }
}
