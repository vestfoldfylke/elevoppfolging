import { logger } from "@vestfoldfylke/loglady"
import type { FrontendOverviewStudent, FrontendOverviewStudentFilter, FrontendOverviewStudentResponse, PrincipalAccess } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { StudentDataSharingConsent, StudentImportantStuff } from "$lib/types/db/shared-types"
import { getStudentsFromCache } from "./cache/students-cache"
import { getDbClient } from "./db/get-db-client"
import { HTTPError } from "./middleware/http-error"

export const getFrontendOverviewStudents = async (principalAccess: PrincipalAccess, studentFilter?: FrontendOverviewStudentFilter): Promise<FrontendOverviewStudentResponse> => {
  logger.info("Fetching students for principal")
  const studentsWithAccessInfo = await getStudentsFromCache(principalAccess, studentFilter)
  logger.info(`Found {StudentsCount} students for principal`, studentsWithAccessInfo.length)

  const dbClient: IDbClient = getDbClient()

  logger.info("Fetching important stuff for students")
  const importantStuffByStudentId: Record<string, Record<string, StudentImportantStuff>> = await dbClient.importantStuff.getStudentsImportantStuff(studentsWithAccessInfo.map((student) => student._id))
  logger.info(`Found important stuff for {ImportantStuffCount} students`, Object.keys(importantStuffByStudentId).length)

  logger.info("Fetching sharing consent for students")
  const sharingConsentByStudentId: Record<string, StudentDataSharingConsent> = await dbClient.studentDataSharingConsents.getStudentsDataSharingConsent(
    studentsWithAccessInfo.map((student) => student._id)
  )
  logger.info(`Found sharing consent for {SharingConsentCount} students`, Object.keys(sharingConsentByStudentId).length)

  const overviewStudents: FrontendOverviewStudent[] = []

  logger.info("Filtering students and adding important stuff to create overview students")

  const now = Date.now()

  for (const student of studentsWithAccessInfo) {
    const accessSchoolsForStudent = Array.from(new Set(student.principalAccessForStudent.map((accessType) => accessType.schoolNumber)))

    if (accessSchoolsForStudent.length === 0) {
      throw new HTTPError(500, `User has no access to any schools for student ${student._id}, this should not happen...`)
    }

    let lastActivityTimestamp: Date | null = null

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
      principalAccessForStudent: student.principalAccessForStudent,
      _id: student._id,
      feideName: student.feideName,
      name: student.name,
      source: student.source,
      enrollmentsWithinViewAccessWindow: student.enrollmentsWithinViewAccessWindow,
      mainClass: student.mainClass,
      mainContactTeacherGroup: student.mainContactTeacherGroup,
      mainSchool: student.mainSchool,
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

    // Apply checkbox filters
    if (Array.isArray(studentFilter?.studentCheckBoxIds) && studentFilter.studentCheckBoxIds.length > 0) {
      const hasCheckBoxIds = studentFilter.studentCheckBoxIds.every((checkBoxId) => {
        return overviewStudent.importantStuff.some((importantStuff) => importantStuff.facilitation.includes(checkBoxId) || importantStuff.followUp.includes(checkBoxId))
      })
      if (!hasCheckBoxIds) {
        continue
      }
    }

    overviewStudents.push(overviewStudent)
  }

  const timeTaken = Date.now() - now
  logger.debug(`Finished filtering students and adding important stuff. Time taken: {TimeTaken} ms.`, timeTaken)

  const timeBeforeDocumentFiltering = Date.now()

  // Apply document filters
  let documentFilteredStudents = overviewStudents

  if (Array.isArray(studentFilter?.templateIds) && studentFilter.templateIds.length > 0) {
    logger.info("Filtering students by templateIds: {TemplateIds}", studentFilter.templateIds)
    const candidateIds = overviewStudents.map((s) => s._id)
    const matchingIds = new Set(await dbClient.documents.getStudentIdsWithDocumentForTemplates(candidateIds, studentFilter.templateIds))
    documentFilteredStudents = overviewStudents.filter((s) => matchingIds.has(s._id))
    logger.info("After templateIds filter: {FilteredCount} of {TotalCount} students remain", documentFilteredStudents.length, overviewStudents.length)
  }

  if (studentFilter?.hasNoDocuments === true) {
    logger.info("Filtering students to those without any documents")
    const candidateIds = documentFilteredStudents.map((s) => s._id)
    const idsWithoutDocuments = new Set(await dbClient.documents.getStudentIdsWithoutDocuments(candidateIds))
    documentFilteredStudents = documentFilteredStudents.filter((s) => idsWithoutDocuments.has(s._id))
    logger.info("After hasNoDocuments filter: {FilteredCount} of {TotalCount} students remain", documentFilteredStudents.length, overviewStudents.length)
  }

  const documentFilteringTimeTaken = Date.now() - timeBeforeDocumentFiltering
  logger.debug(`Finished applying document filters. Time taken: {TimeTaken} ms. Returning {FilteredCount} of {TotalCount} students`, documentFilteringTimeTaken, documentFilteredStudents.length, overviewStudents.length)

  const studentReturnLength = studentFilter?.top ?? documentFilteredStudents.length

  logger.info(
    `Finished filtering students and adding important stuff. Returning {OverviewStudentCount} overview students capped to {OverviewStudentCountCapped}`,
    documentFilteredStudents.length,
    studentReturnLength
  )

  const students = documentFilteredStudents
    .sort((a, b) => {
      const sortBy = studentFilter?.sortBy || "studentName"
      const sortDirection = studentFilter?.sortDirection === "descending" ? -1 : 1

      switch (sortBy) {
        case "lastActivity": {
          const aTimestamp = a.lastActivityTimestamp ? a.lastActivityTimestamp.getTime() : 0
          const bTimestamp = b.lastActivityTimestamp ? b.lastActivityTimestamp.getTime() : 0
          return (aTimestamp - bTimestamp) * sortDirection
        }
        case "studentName":
          return a.name.localeCompare(b.name) * sortDirection
        case "className": {
          const aClassName = a.mainClass?.name || ""
          const bClassName = b.mainClass?.name || ""
          return aClassName.localeCompare(bClassName) * sortDirection
        }
        case "contactTeacherName": {
          const aContactTeacherName = a.mainContactTeacherGroup?.teachers[0]?.name || ""
          const bContactTeacherName = b.mainContactTeacherGroup?.teachers[0]?.name || ""
          return aContactTeacherName.localeCompare(bContactTeacherName) * sortDirection
        }
        default:
          return 0
      }
    })
    .slice(0, studentReturnLength)

  return {
    students,
    totalStudentCount: overviewStudents.length
  }
}
