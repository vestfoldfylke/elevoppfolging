import { logger } from "@vestfoldfylke/loglady"
import { APP_INFO } from "$lib/server/app-info"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { FrontendOverviewStudent, PrincipalAccessStudent, RootLayoutData } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, SchoolInfo, StudentClassGroup, StudentDataSharingConsent, StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"
import type { LayoutServerLoad } from "./$types"

const layoutLoad: ServerLoadNextFunction<RootLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()

  const principalAccess: Access | null = await dbClient.getPrincipalAccess(principal.id)

  if (!principalAccess) {
    logger.info(`No access entry found for user ${principal.id}, but apparently have access through entra, quick return with no students, schools or anything`)
    return {
      data: {
        authenticatedPrincipal: principal,
        APP_INFO,
        classes: [],
        principalAccess,
        studentCheckBoxes: [],
        students: [],
        schools: []
      },
      isAuthorized: true
    }
  }

  logger.info("NÅ HENTER JEG ELEVER") // TODO - indexer på felter, drit i å sjekke date.. Det kan vi ta i egen logikk (getStudentAccessInfo)
  const now = Date.now()
  const studentsWithAccessInfo: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)
  const timeTaken = Date.now() - now
  logger.info(`Fant ${studentsWithAccessInfo.length} elever - brukte ${timeTaken / 1000} sekunder`)

  logger.info("NÅ HENTER JEG IMPORTANT STUFF FOR ELEVENE JEG FANT")
  const now2 = Date.now()
  const importantStuffByStudentId: Record<string, Record<string, StudentImportantStuff>> = await dbClient.getStudentsImportantStuff(studentsWithAccessInfo.map((student) => student._id))
  const timeTaken2 = Date.now() - now2
  logger.info(`Fant important stuff for ${Object.keys(importantStuffByStudentId).length} elever - brukte ${timeTaken2 / 1000} sekunder`)

  logger.info("NÅ HENTER JEG SHARING CONSENT FOR ELEVENE JEG FANT")
  const now3 = Date.now()
  const sharingConsentByStudentId: Record<string, StudentDataSharingConsent> = await dbClient.getStudentsDataSharingConsent(studentsWithAccessInfo.map((student) => student._id))
  const timeTaken3 = Date.now() - now3
  logger.info(`Fant sharing consent for ${Object.keys(sharingConsentByStudentId).length} elever - brukte ${timeTaken3 / 1000} sekunder`)

  // Og deretter kan getStudentAccessInfo returnere alle elevene eller no fett?
  // Og den kan få lov å kjøre i parallell for alle elevene, og bli cachet i et kvarter ellerno. Men hvis de lager et dokument, så stemmer jo ikke lastactivity, så den kan vi ha på utsiden?
  // Vi kan cache tilgangen og samtykke en kort stund hvis det er for tregt

  const overviewStudents: FrontendOverviewStudent[] = []

  logger.info("NÅ SKAL JEG SJEKKE SISTE AKTIVITETSTIDSPUNKT FOR ALLE ELEVER OG MAPPE ALLE SAMMEN")
  const now4 = Date.now()
  for (const student of studentsWithAccessInfo) {
    const accessSchoolsForStudent = student.accessTypes.map((accessType) => accessType.schoolNumber)

    if (accessSchoolsForStudent.length === 0) {
      throw new HTTPError(500, `User has no access to any schools for student ${student._id}, this should not happen...`)
    }

    // Hvis eleven har samtykket til deling, kan vi finne nyeste timestamp basert på ALLE importantStuff
    // Hvis eleven ikke har samtykket til deling, kan vi bare finne nyeste timestamp basert på importantStuff knyttet til skoler brukeren har tilgang på

    let lastActivityTimestamp: Date | null = null

    // Hent samtykke

    if (sharingConsentByStudentId[student._id]?.consent) {
      // Finn siste aktivitet basert på alle importantStuff siden eleven har samtykket til deling av ALL informasjon
      for (const importantStuff of Object.values(importantStuffByStudentId[student._id] || {})) {
        if (lastActivityTimestamp === null || lastActivityTimestamp < importantStuff.lastActivityTimestamp) {
          lastActivityTimestamp = importantStuff.lastActivityTimestamp
        }
      }
    } else {
      // Finn siste aktivitet basert på importantStuff knyttet til skoler brukeren har tilgang på
      for (const schoolNumber of accessSchoolsForStudent) {
        const importantStuffForSchool = importantStuffByStudentId[student._id]?.[schoolNumber]
        if (importantStuffForSchool) {
          if (lastActivityTimestamp === null || lastActivityTimestamp < importantStuffForSchool.lastActivityTimestamp) {
            lastActivityTimestamp = importantStuffForSchool.lastActivityTimestamp
          }
        }
      }
    }

    const overviewStudent: FrontendOverviewStudent = {
      accessTypes: student.accessTypes,
      _id: student._id,
      feideName: student.feideName,
      name: student.name,
      source: student.source,
      enrollmentsWithinViewAccessWindow: student.enrollmentsWithinViewAccessWindow,
      dataSharingConsent: sharingConsentByStudentId[student._id]?.consent || false,
      importantStuff: [],
      lastActivityTimestamp
    }

    // Add important stuff for schools the user has access to
    for (const schoolNumber of accessSchoolsForStudent) {
      const importantStuffForSchool = importantStuffByStudentId[student._id]?.[schoolNumber]
      if (importantStuffForSchool) {
        overviewStudent.importantStuff.push(importantStuffForSchool)
      }
    }

    overviewStudents.push(overviewStudent)
  }

  const timeTaken4 = Date.now() - now4
  logger.info(`Sjekket siste aktivitetstidspunkt og mappet important stuff for ${overviewStudents.length} elever - brukte ${timeTaken4 / 1000} sekunder`)
  logger.info(`Totalt tid brukt på å hente og mappe elever: ${(timeTaken + timeTaken2 + timeTaken3 + timeTaken4) / 1000} sekunder`)

  logger.info("Fetching student check boxes")
  const studentCheckBoxes = await dbClient.getStudentCheckBoxes()
  logger.info(`Found ${studentCheckBoxes.length} student check boxes`)

  logger.info("Fetching schools")
  const schoolsFromDb = await dbClient.getSchools()
  const schoolsInfo: SchoolInfo[] = schoolsFromDb.map((school) => ({
    name: school.name,
    schoolNumber: school.schoolNumber
  }))
  logger.info(`Found ${schoolsFromDb.length} schools`)

  logger.info("NÅ FILTRERER JEG KLASSER BRUKER HAR TILGANG PÅ")
  const now5: number = Date.now()
  const classes: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, overviewStudents)
  const timeTaken5: number = Date.now() - now5
  logger.info(`Fant ${classes.length} klasser - brukte ${timeTaken5 / 1000} sekunder`)

  return {
    data: {
      authenticatedPrincipal: principal,
      APP_INFO,
      classes,
      principalAccess,
      studentCheckBoxes,
      students: overviewStudents,
      schools: schoolsInfo
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<RootLayoutData> => {
  return serverLoadRequestMiddleware(requestEvent, layoutLoad)
}
