import type { CachedFrontendStudent, CachedFrontendStudentWithAccessInfo } from "$lib/types/app-types";
import type { Access } from "$lib/types/db/shared-types";
import { logger } from "@vestfoldfylke/loglady";
import { getStudentAccessInfo } from "../authorization/student-access";
import { getDbClient } from "../db/get-db-client";
import { APP_INFO } from "../app-info";
import { getFrontendStudentDetails } from "$lib/utils/frontend-student-details";

type StudentsCache = {
  updateInProgress: boolean
  updated: Date | null
  students: CachedFrontendStudent[]
}

const studentsCache: StudentsCache = {
  updateInProgress: false,
  updated: null,
  students: []
}

export const updateStudentsCache = async () => {
  if (studentsCache.updateInProgress) {
    logger.info("Update of students cache already in progress, skipping")
    return
  }
  logger.info("Updating students cache")
  studentsCache.updateInProgress = true
  const dbClient = getDbClient()
  logger.info("Fetching all students from database to update cache")
  const startTime = Date.now()
  const students = await dbClient.getAllStudents()
  const endTime = Date.now()
  logger.info(`Fetched ${students.length} students from database in ${(endTime - startTime) / 1000}s, updating cache`)
  studentsCache.students = students.map((student) => ({
    ...student,
    ...getFrontendStudentDetails(student, APP_INFO)
  }))
  studentsCache.updated = new Date()
  studentsCache.updateInProgress = false
  console.log("memory used", process.memoryUsage().heapUsed / 1024 / 1024, "MB")
}

/**
 * 
 * returns student available based on the access parameter
 * If cache is empty, it will populate the cache before returning students
 * If cache is too old, it will update the cache in the background but return the old cache for now, to avoid making users wait for the cache to update. 
 */
export const getStudentsFromCache = async (access: Access): Promise<CachedFrontendStudentWithAccessInfo[]> => {
  const studentsWithAccessInfo: CachedFrontendStudentWithAccessInfo[] = []
  // If first time or cache is empty, populate cache before returning students
  if (!studentsCache.updated || studentsCache.students.length === 0) {
    logger.info("Students cache is empty, populating cache before returning students, user will have to wait...")
    await updateStudentsCache()
    for (const student of studentsCache.students) {
      const studentAccessInfo = getStudentAccessInfo(student, access)
      if (studentAccessInfo.length > 0) {
        studentsWithAccessInfo.push({
          _id: student._id,
          feideName: student.feideName,
          name: student.name,
          created: student.created,
          modified: student.modified,
          studentNumber: student.studentNumber,
          systemId: student.systemId,
          studentEnrollments: student.studentEnrollments,
          source: student.source,
          mainSchool: student.mainSchool,
          mainClassMembership: student.mainClassMembership,
          mainContactTeacherGroupMembership: student.mainContactTeacherGroupMembership,
          additionalSchools: student.additionalSchools,
          accessTypes: studentAccessInfo
        })
      }
    }
    return studentsWithAccessInfo
  }

  // IF cache is too old, update it in the background but return the old cache for now
  const now = new Date()
  const cacheAgeMinutes = (now.getTime() - studentsCache.updated.getTime()) / 1000 / 60
  if (cacheAgeMinutes > APP_INFO.STUDENT_CACHE_MAX_AGE_MINUTES) {
    logger.info(`Students cache is ${cacheAgeMinutes} minutes old, requesting update in background`)
    updateStudentsCache().catch((error) => {
      logger.errorException(error, "Error updating students cache, application is probably unusable until this is fixed")
    })
  }

  for (const student of studentsCache.students) {
    const studentAccessInfo = getStudentAccessInfo(student, access)
    if (studentAccessInfo.length > 0) {
      studentsWithAccessInfo.push({
        ...student,
        accessTypes: studentAccessInfo
      })
    }
  }
  return studentsWithAccessInfo
}
