import { logger } from "@vestfoldfylke/loglady"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent, StudentAccessPerson, StudentMemberships } from "$lib/types/app-types"
import { expandAccessWithProgramAreaNames } from "../authorization/principal-access"
import { getPrincipalAccessForStudent } from "../authorization/student-access"
import { getDbClient } from "../db/get-db-client"
import { getStudentFromCache, getStudentMembershipsFromCache } from "./students-cache"
import { getAppUserFromCache } from "./users-cache"

type StudentAccessCache = Record<string, StudentAccessPerson[]>

let studentAccessCache: StudentAccessCache = {}

export const invalidateStudentAccessCache = () => {
  studentAccessCache = {}
}

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

  // Trenger også å hente programområder som inneholder klasser eleven er i. Hente fra db - hvilke programområde-ider inneholder klasser fra studentMemberships
  const programAreaIdsToCheck = (await dbClient.getProgramAreasFromClassIds(studentMemberships.classes.map((classGroup) => classGroup.systemId))).map((programArea) => programArea._id)

  const studentAccess = await dbClient.getStudentAccess(studentId, studentMemberships, programAreaIdsToCheck)

  logger.info(`Got ${studentAccess.length} access for student ${studentId} from db`)

  const studentAccessPersons: StudentAccessPerson[] = []
  for (const access of studentAccess) {
    const appUser = await getAppUserFromCache(access.entraUserId)
    if (!appUser) {
      logger.warn(`App user with Entra ID ${access.entraUserId} not found, skipping access entry for student ${studentId}`)
      continue
    }

    const principalAccess: PrincipalAccess = await expandAccessWithProgramAreaNames(access)

    const principalAccessForStudent: PrincipalAccessForStudent[] = getPrincipalAccessForStudent(student, principalAccess)

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
