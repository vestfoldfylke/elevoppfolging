import { logger } from "@vestfoldfylke/loglady"
import type { CachedFrontendStudent, PrincipalAccessForStudent, StudentAccessPerson, StudentMemberships } from "$lib/types/app-types"
import { getPrincipalAccessForStudent } from "../authorization/student-access"
import { getDbClient } from "../db/get-db-client"
import { getStudentFromCache, getStudentMembershipsFromCache } from "./students-cache"
import { getAppUserFromCache } from "./users-cache"

type StudentAccessCache = Record<string, StudentAccessPerson[]>

const studentAccessCache: StudentAccessCache = {}

// TODO Refreshe access for en elev når det blir gitt tilgang eller fjernet tilgang der eleven er involverad (mulig bare wipe hele cachen når noen gjør tilgangsendringer)

export const getStudentAccessPersonsFromCache = async (studentId: string): Promise<StudentAccessPerson[]> => {
  const cacheEntry = studentAccessCache[studentId]
  if (cacheEntry) {
    logger.info(`Cache hit for student access with ID ${studentId}`)
    return cacheEntry
  }

  const student: CachedFrontendStudent | null = await getStudentFromCache(studentId)
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found in cache`)
  }
  const studentMemberships: StudentMemberships = await getStudentMembershipsFromCache(studentId)
  const dbClient = getDbClient()
  const studentAccess = await dbClient.getStudentAccess(studentId, studentMemberships)
  logger.info(`Got ${studentAccess.length} access for student ${studentId} from db`)

  const studentAccessPersons: StudentAccessPerson[] = []
  for (const access of studentAccess) {
    const appUser = await getAppUserFromCache(access.entraUserId)
    if (!appUser) {
      logger.warn(`App user with Entra ID ${access.entraUserId} not found, skipping access entry for student ${studentId}`)
      continue
    }
    const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, access)
    if (principalAccessForStudent.length > 0) {
      studentAccessPersons.push({
        principalAccessForStudent: principalAccessForStudent,
        entra: {
          displayName: appUser.entra.displayName,
          id: access.entraUserId,
          userPrincipalName: appUser.entra.userPrincipalName
        }
      })
    }
  }

  studentAccessCache[studentId] = studentAccessPersons

  return studentAccessPersons
}
