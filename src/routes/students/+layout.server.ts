import { getStudentAccessInfo } from "$lib/server/authorization/student-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { FrontendOverviewStudentWithImportantStuff, FrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { StudentImportantStuff } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { logger } from "@vestfoldfylke/loglady"
import type { LayoutServerLoad } from "./$types"

type StudentsPageData = {
  students: FrontendOverviewStudentWithImportantStuff[]
}

const getStudents: ServerLoadNextFunction<StudentsPageData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()
  /*
	- Get access for current principal
	- Pass access to dbClient.getStudents to filter students based on access
	- Returns list of students with some (but not too much) data - klasser navn, kontaktlærer etc
	*/
  const access = await dbClient.getPrincipalAccess(principal)

  if (!access) {
    return {
      data: {
        students: []
      },
      isAuthorized: false
    }
  }

  logger.info("NÅ HENTER JEG ELEVER")
  const now = Date.now()
  const students: FrontendStudent[] = await dbClient.getStudents(access)
  const timeTaken = Date.now() - now
  logger.info(`Fant ${students.length} elever - brukte ${timeTaken/1000} sekunder`)

  logger.info("NÅ HENTER JEG IMPORTANT STUFF FOR ALLE ELEVER")
  const now2 = Date.now()
  const importantStuffByStudentId: Record<string, Record<string, StudentImportantStuff>> = await dbClient.getStudentsImportantStuff(students.map(student => student._id))
  const timeTaken2 = Date.now() - now2
  logger.info(`Fant important stuff for ${Object.keys(importantStuffByStudentId).length} elever - brukte ${timeTaken2/1000} sekunder`)

  const overviewStudents: FrontendOverviewStudentWithImportantStuff[] = []


  logger.info("NÅ SKAL JEG SJEKKE SISTE AKTIVITETSTIDSPUNKT FOR ALLE ELEVER OG MAPPE ALLE SAMMEN")
  const now3 = Date.now()
  for (const student of students) {
    const studentAccessInfo = await getStudentAccessInfo(student, access)
    const accessSchoolsForStudent = studentAccessInfo.accessTypes.map((accessType) => accessType.schoolNumber)
    
    if (accessSchoolsForStudent.length === 0) {
      throw new Error(`Student ${student._id} has no access schools. This should not happen since we got the student through an access-based query, but it can happen if the access was deleted after we fetched the students but before we fetched the important stuff.`)
    }

    // Hvis eleven har samtykket til deling, kan vi finne nyeste timestamp basert på ALLE importantStuff
    // Hvis eleven ikke har samtykket til deling, kan vi bare finne nyeste timestamp basert på importantStuff knyttet til skoler brukeren har tilgang på

    let lastActivityTimestamp: Date | null = null

    // Hent samtykke

    if (studentAccessInfo.studentDataSharingConsent) {
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

    const overviewStudent: FrontendOverviewStudentWithImportantStuff = {
      _id: student._id,
      name: student.name,
      created: student.created,
      modified: student.modified,
      feideName: student.feideName,
      mainEnrollment: student.mainEnrollment,
      source: student.source,
      studentNumber: student.studentNumber,
      systemId: student.systemId,
      importantStuff: importantStuffByStudentId[student._id]?.[accessSchoolsForStudent[0]] || null,
      lastActivityTimestamp
    }

    overviewStudents.push(overviewStudent)
  }
  const timeTaken3 = Date.now() - now3
  logger.info(`Sjekket siste aktivitetstidspunkt og mappet important stuff for ${overviewStudents.length} elever - brukte ${timeTaken3/1000} sekunder`)
  logger.info(`Totalt tid brukt på å hente og mappe elever: ${(timeTaken + timeTaken2 + timeTaken3)/1000} sekunder`)

  return {
    data: {
      students: overviewStudents
    },
    isAuthorized: true
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<StudentsPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getStudents)
}
