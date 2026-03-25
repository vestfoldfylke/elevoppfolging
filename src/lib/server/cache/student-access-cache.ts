import { logger } from "@vestfoldfylke/loglady"
import type { AccessEntry, CachedFrontendStudent, StudentAccess, StudentMemberships } from "$lib/types/app-types"
import { getPrincipalAccessEntriesForStudent } from "../authorization/student-access"
import { getDbClient } from "../db/get-db-client"
import { getStudentFromCache, getStudentMembershipsFromCache } from "./students-cache"
import { getAppUserFromCache } from "./users-cache"

type StudentAccessCache = Record<string, StudentAccess[]>

const studentAccessCache: StudentAccessCache = {}

export const getStudentAccessInfoFromCache = async (studentId: string): Promise<StudentAccess[]> => {
  const cacheEntry = studentAccessCache[studentId]
  if (cacheEntry) {
    logger.info(`Cache hit for student access with ID ${studentId}`)
    return cacheEntry
  }

  // Cache miss, populate entry and cache it before returning
  /*
    Det vi trenger er alle med tilgang til eleven, og hva slags tilgang, med entra-bruker data i tillegg
    Vi kan kjøre en db spørring basert på masse greier

    hent alle skoler eleven er i, alle klassene eleven er i, alle programområder
    lag spørring rett mot access for å hente alle med tilgang på disse

    eller skal vi bare cache alle brukere, med tilgang og mappe det... vi henter jo allerede alle brukerne...

    må oppdatere denne cachen når noen oppdaterer tilgang på en elev.. Eller kan vi faktisk bare oppdatere cachen for elevene det gjelder når det skjer endring.

    get access der
    hent alle skoler eleven er i, alle grupper eleven er i, alle programområder
  */

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found in cache`)
  }
  const studentMemberships: StudentMemberships = await getStudentMembershipsFromCache(studentId)
  const dbClient = getDbClient()
  const studentAccess = await dbClient.getStudentAccess(studentId, studentMemberships)
  logger.info(`Got ${studentAccess.length} access for student ${studentId} from db`)
  const accessInfo: StudentAccess[] = []
  for (const access of studentAccess) {
    const appUser = await getAppUserFromCache(access.entraUserId)
    if (!appUser) {
      logger.warn(`App user with Entra ID ${access.entraUserId} not found, skipping access entry for student ${studentId}`)
      continue
    }
    const studentAccessInfo: AccessEntry[] = getPrincipalAccessEntriesForStudent(student, access)
    if (studentAccessInfo.length > 0) {
      accessInfo.push({
        accessTypes: studentAccessInfo,
        entra: {
          displayName: appUser.entra.displayName,
          id: access.entraUserId,
          userPrincipalName: appUser.entra.userPrincipalName
        }
      })
    }
  }

  studentAccessCache[studentId] = accessInfo

  return accessInfo
}
