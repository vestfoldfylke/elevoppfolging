import { logger } from "@vestfoldfylke/loglady"
import type { CachedFrontendStudent, FrontendStudent, PrincipalAccessStudent, StudentMemberships } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"
import { getEnrollmentsWithinViewAccessWindow } from "$lib/utils/frontend-student-details"
import { APP_INFO } from "../app-info"
import { getPrincipalAccessEntriesForStudent } from "../authorization/student-access"
import { getDbClient } from "../db/get-db-client"

type StudentsCache = {
  updateInProgress: boolean
  updated: Date | null
  students: Map<string, CachedFrontendStudent>
  studentsListCache: CachedFrontendStudent[] | null
}

const studentsCache: StudentsCache = {
  updateInProgress: false,
  updated: null,
  students: new Map(),
  studentsListCache: null
}

export const updateStudentsCache = async () => {
  if (studentsCache.updateInProgress) {
    logger.warn("Update of students cache already in progress, skipping")
    return
  }

  logger.info("Updating students cache")
  studentsCache.updateInProgress = true
  const dbClient = getDbClient()

  logger.info("Fetching all students from database to update cache")
  const startTime = Date.now() // TODO remove date stuff when we know its ok
  const students = await dbClient.getAllStudents()
  const endTime = Date.now()
  logger.info(`Fetched ${students.length} students from database in ${(endTime - startTime) / 1000}s, updating cache`)

  const tempStudentsMap: Map<string, CachedFrontendStudent> = new Map()

  for (const student of students) {
    tempStudentsMap.set(student._id, {
      ...student,
      enrollmentsWithinViewAccessWindow: getEnrollmentsWithinViewAccessWindow(student, APP_INFO)
    })
  }

  studentsCache.students = tempStudentsMap
  studentsCache.studentsListCache = Array.from(tempStudentsMap.values()) // Reset list cache, remember to invalidate on updates to studentsCache.students as well

  studentsCache.updated = new Date()
  studentsCache.updateInProgress = false

  logger.info(`Students cache updated with ${studentsCache.students.size} students, cache age reset to 0 minutes`)
  logger.info(`Memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`)
}

export const updateStudentsCacheInBackgroundIfExpired = () => {
  // IF cache is too old, update it in the background
  const now = new Date()
  const cacheAgeMinutes = studentsCache.updated ? (now.getTime() - studentsCache.updated.getTime()) / 1000 / 60 : null
  if (!cacheAgeMinutes || cacheAgeMinutes > APP_INFO.STUDENT_CACHE_MAX_AGE_MINUTES) {
    logger.info(`Students cache is ${cacheAgeMinutes} minutes old, requesting update in background`)
    updateStudentsCache().catch((error) => {
      logger.errorException(error, "Error updating students cache, application is probably unusable until this is fixed")
    })
  }
}

/**
 *
 * returns student available based on the access parameter.
 * If cache is empty, it will populate the cache before returning students.
 * If cache is too old, it will update the cache in the background but return the old cache for now, to avoid making users wait for the cache to update.
 */
export const getStudentsFromCache = async (access: Access): Promise<PrincipalAccessStudent[]> => {
  const studentsWithAccessInfo: PrincipalAccessStudent[] = []

  // If first time or cache is empty, populate cache before returning students
  if (!studentsCache.updated || studentsCache.students.size === 0) {
    logger.info("Students cache is empty, populating cache before returning students, user will have to wait...")
    await updateStudentsCache()
  } else {
    updateStudentsCacheInBackgroundIfExpired()
  }

  if (!studentsCache.studentsListCache) {
    throw new Error("Students cache is not populated after update, cannot return students from cache, something is wrong gitt")
  }

  for (const student of studentsCache.studentsListCache) {
    const studentAccessInfo = getPrincipalAccessEntriesForStudent(student, access)
    if (studentAccessInfo.length > 0) {
      studentsWithAccessInfo.push({
        _id: student._id,
        feideName: student.feideName,
        name: student.name,
        source: student.source,
        enrollmentsWithinViewAccessWindow: student.enrollmentsWithinViewAccessWindow,
        accessTypes: studentAccessInfo
      })
    }
  }
  return studentsWithAccessInfo
}

export const getStudentFromCache = async (studentId: string): Promise<CachedFrontendStudent | null> => {
  // If first time or cache is empty, populate cache before returning students
  if (!studentsCache.updated || studentsCache.students.size === 0) {
    logger.info("Students cache is empty, populating cache before returning student, user will have to wait...")
    await updateStudentsCache()
  } else {
    updateStudentsCacheInBackgroundIfExpired()
  }

  const student = studentsCache.students.get(studentId)
  return student || null
}

export const getStudentMembershipsFromCache = async (studentId: string): Promise<StudentMemberships> => {
  if (!studentsCache.updated) {
    logger.info("Students cache is empty, populating cache before returning students, user will have to wait...")
    await updateStudentsCache()
  } else {
    updateStudentsCacheInBackgroundIfExpired()
  }

  const student = studentsCache.students.get(studentId)
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found in cache`)
  }

  return {
    schoolNumbers: student.enrollmentsWithinViewAccessWindow.map((enrollment) => enrollment.school.schoolNumber),
    classes: student.enrollmentsWithinViewAccessWindow.flatMap((enrollment) =>
      enrollment.classMemberships.map((classMembership) => ({ schoolNumber: enrollment.school.schoolNumber, systemId: classMembership.classGroup.systemId }))
    ),
    contactTeacherGroups: student.enrollmentsWithinViewAccessWindow.flatMap((enrollment) =>
      enrollment.contactTeacherGroupMemberships.map((groupMembership) => ({ schoolNumber: enrollment.school.schoolNumber, systemId: groupMembership.contactTeacherGroup.systemId }))
    ),
    teachingGroups: student.enrollmentsWithinViewAccessWindow.flatMap((enrollment) =>
      enrollment.teachingGroupMemberships.map((groupMembership) => ({ schoolNumber: enrollment.school.schoolNumber, systemId: groupMembership.teachingGroup.systemId }))
    )
  }
}

export const upsertStudentInCache = async (student: FrontendStudent): Promise<void> => {
  let retries: number = 0
  while (studentsCache.updateInProgress) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    retries++
    if (retries === 5) {
      logger.warn("Aborting upsert. Waited 5 seconds for student cache update to finish. Giving up. Student with ID {StudentId} was not upserted in cache", student._id)
      return
    }
  }

  logger.info("Upserting student in cache")
  studentsCache.updateInProgress = true

  const cachedStudent: CachedFrontendStudent = {
    ...student,
    enrollmentsWithinViewAccessWindow: getEnrollmentsWithinViewAccessWindow(student, APP_INFO)
  }

  studentsCache.students.set(student._id, cachedStudent)
  logger.info("Student updated in student Map")

  // update list cache
  if (studentsCache.studentsListCache !== null) {
    const studentListCacheIndex: number = studentsCache.studentsListCache.findIndex((studentEntry: CachedFrontendStudent) => studentEntry._id === student._id)
    if (studentListCacheIndex > -1) {
      studentsCache.studentsListCache[studentListCacheIndex] = cachedStudent
      logger.info("Updated student list at index {Index} with updated student", studentListCacheIndex)
    } else {
      studentsCache.studentsListCache.push(cachedStudent)
      logger.info("Inserted student to student list")
    }
  }

  studentsCache.updateInProgress = false

  logger.info(`Student in cache upserted, cache age NOT reset`)
  logger.info(`Memory used: ${process.memoryUsage().heapUsed / 1024 / 1024} MB`)
}
