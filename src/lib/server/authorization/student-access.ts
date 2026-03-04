import type { AccessType, FrontendStudent, StudentAccessInfo } from "$lib/types/app-types"
import type { Access, StudentEnrollment } from "$lib/types/db/shared-types"
import { getDbClient } from "../db/get-db-client"

const getSchoolAccess = (studentEnrollment: StudentEnrollment, access: Access): AccessType | undefined => {
  return access.schools.find((entry) => studentEnrollment.school.schoolNumber === entry.schoolNumber)
}

const getExplicitStudentAccess = (studentEnrollment: StudentEnrollment, access: Access): AccessType | undefined => {
  return access.students.find((entry) => entry.systemId === studentEnrollment.systemId && studentEnrollment.school.schoolNumber === entry.schoolNumber)
}

const getProgramAreaAccess = async (studentEnrollment: StudentEnrollment, access: Access): Promise<AccessType | undefined> => {
  if (access.programAreas.length === 0) {
    return undefined
  }

  if (!access.programAreas.some((entry) => entry.schoolNumber === studentEnrollment.school.schoolNumber)) {
    return undefined
  }

  const dbClient = getDbClient()
  for (const programAreaAccess of access.programAreas.filter((entry) => entry.schoolNumber === studentEnrollment.school.schoolNumber)) {
    const programArea = await dbClient.getProgramArea(programAreaAccess._id)
    if (!programArea) {
      continue
    }
    /*
      Må sjekke om eleven er med i en av klassene som hører til dette undervisningsområdet - så fall er det avdelingsleder tilgang
    */

    const hasProgramAreaAccess = studentEnrollment.classMemberships.some((classMembership) => {
      return programArea.classes.some((programAreaClass) => programAreaClass.systemId === classMembership.classGroup.systemId)
    })
    if (hasProgramAreaAccess) {
      return programAreaAccess
    }
  }

  return undefined
}

const getContactTeacherGroupAccess = (studentEnrollment: StudentEnrollment, access: Access): AccessType | undefined => {
  // Da sjekker vi om noen av kontaktlærergruppene til eleven matcher noen av tilgangene
  return access.contactTeacherGroups.find((entry) => {
    if (studentEnrollment.school.schoolNumber !== entry.schoolNumber) {
      return false
    }
    return studentEnrollment.contactTeacherGroupMemberships.some((membership) => membership.contactTeacherGroup.systemId === entry.systemId)
  })
}

const getClassAccess = (studentEnrollment: StudentEnrollment, access: Access): AccessType | undefined => {
  // Da sjekker vi om noen av klassene til eleven matcher noen av tilgangene
  return access.classes.find((entry) => {
    if (studentEnrollment.school.schoolNumber !== entry.schoolNumber) {
      return false
    }
    return studentEnrollment.classMemberships.some((membership) => membership.classGroup.systemId === entry.systemId)
  })
}

const getTeachingGroupAccess = (studentEnrollment: StudentEnrollment, access: Access): AccessType | undefined => {
  // Da sjekker vi om noen av undervisningsgruppene til eleven matcher noen av tilgangene
  return access.teachingGroups.find((entry) => {
    if (studentEnrollment.school.schoolNumber !== entry.schoolNumber) {
      return false
    }
    return studentEnrollment.teachingGroupMemberships.some((membership) => membership.teachingGroup.systemId === entry.systemId)
  })
}

const accessTypePriority: Record<AccessType["type"], number> = {
  "MANUELL-SKOLELEDER-TILGANG": 1,
  "MANUELL-ELEV-TILGANG": 2,
  "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG": 3,
  "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG": 4,
  "AUTOMATISK-KLASSE-TILGANG": 5,
  "MANUELL-KLASSE-TILGANG": 5, // samme prioritet som automatisk klasse-tilgang
  "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG": 6
}

const getAccessTypeForEnrollment = async (studentEnrollment: StudentEnrollment, access: Access): Promise<AccessType | null> => {
  /* Strongest access wins
  1. skoleleder
  2. enkeltelev
  3. avdelingsleder / rådgiver
  4. kontaktlærer (automatisk fra kontaktlærergruppe)
  5. faglærere (automatisk undervisningsgruppe og automatisk klasse)
  */
  const schoolAccess = getSchoolAccess(studentEnrollment, access)
  if (schoolAccess) {
    return schoolAccess
  }

  const studentAccess = getExplicitStudentAccess(studentEnrollment, access)
  if (studentAccess) {
    return studentAccess
  }

  const programAreaAccess = await getProgramAreaAccess(studentEnrollment, access)
  if (programAreaAccess) {
    return programAreaAccess
  }

  const contactTeacherAccess = getContactTeacherGroupAccess(studentEnrollment, access)
  if (contactTeacherAccess) {
    return contactTeacherAccess
  }

  const classAccess = getClassAccess(studentEnrollment, access)
  if (classAccess) {
    return classAccess
  }

  const teachingGroupAccess = getTeachingGroupAccess(studentEnrollment, access)
  if (teachingGroupAccess) {
    return teachingGroupAccess
  }

  return null
}

/**
 * Henter ut høyeste tilgangstype for en elev per skole basert på elevens elevforhold og tilgangene i Access-objektet. Hvis eleven har flere elevforhold på en skole, vil den sterkeste tilgangstypen blant disse bli returnert.
 * Dersom det finnes en access på elevens hovedskole, vil denne tilgangen ligge først i arrayet
 */
export const getStudentAccessInfo = async (student: FrontendStudent, access: Access): Promise<StudentAccessInfo> => {
  const accessTypes: AccessType[] = []
  for (const enrollment of student.studentEnrollments.sort((a) => { return a.mainSchool ? -1 : 1 })) {
    const accessType = await getAccessTypeForEnrollment(enrollment, access)
    if (accessType) {
      const existingAccessTypeIndex = accessTypes.findIndex((existingAccessType) => existingAccessType.schoolNumber === accessType.schoolNumber)
      // Sjekk om det allerede finnes en tilgangstype for denne skolen, og i så fall om den nye tilgangstypen har høyere prioritet enn den eksisterende
      if (existingAccessTypeIndex !== -1) {
        const existingAccessType = accessTypes[existingAccessTypeIndex]
        if (accessTypePriority[accessType.type] < accessTypePriority[existingAccessType.type]) {
          accessTypes[existingAccessTypeIndex] = accessType
        }
      } else {
        accessTypes.push(accessType)
      }
    }
  }
  const dbClient = getDbClient()
  const studentDataSharingConsent = await dbClient.getStudentDataSharingConsent(student._id)

  return {
    accessTypes,
    studentDataSharingConsent: studentDataSharingConsent?.consent || false
  }
}
