import type { AccessEntry, FrontendStudent } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"
import { getPeriodDetails } from "$lib/utils/period"
import { APP_INFO } from "../app-info"

/**
 * Henter ut høyeste tilgangstype for en elev per skole basert på elevens elevforhold og tilgangene i Access-objektet. Hvis eleven har flere elevforhold på en skole, vil den høyeste tilgangstypen blant disse bli returnert.
 */
export const getStudentAccessInfo = (student: FrontendStudent, access: Access): AccessEntry[] => {
  // Putt på en cache her hvis det trengs

  // Begynner med prioritert tilgang og går nedover derfra. Henter bare høyeste tilgangstype per skole, for å slippe å måtte håndtere flere access entries for samme skole i resten av logikken
  let enrollmentsToCheck = student.studentEnrollments.filter((enrollment) => {
    const enrollmentPeriod = getPeriodDetails(enrollment.period, APP_INFO)
    return enrollmentPeriod.active || enrollmentPeriod.withinViewAccessWindow
  })

  const accessTypesForCurrentStudent: AccessEntry[] = []

  for (const schoolAccess of access.schools) {
    const schoolAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      return enrollment.school.schoolNumber === schoolAccess.schoolNumber
    })
    if (schoolAccessForCurrentStudent) {
      accessTypesForCurrentStudent.push(schoolAccess)
    }
  }

  // No need to check enrollments where already school access
  enrollmentsToCheck = enrollmentsToCheck.filter((enrollment) => {
    return !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === enrollment.school.schoolNumber)
  })
  if (enrollmentsToCheck.length === 0) {
    return accessTypesForCurrentStudent
  }

  // If school access, no need to check other access types for that school
  for (const studentAccess of access.students.filter(entry => !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === entry.schoolNumber))) {
    const studentAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => enrollment.school.schoolNumber === studentAccess.schoolNumber)
    if (studentAccessForCurrentStudent) {
      accessTypesForCurrentStudent.push(studentAccess)
    }
  }

  // No need to check enrollments where already school access
  enrollmentsToCheck = enrollmentsToCheck.filter((enrollment) => {
    return !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === enrollment.school.schoolNumber)
  })
  if (enrollmentsToCheck.length === 0) {
    return accessTypesForCurrentStudent
  }

  // TODO - programområder / programAreas når vi har en cache på det for å slippe drittoppslag hele tida

  // // If school access, no need to check other access types for that school
  for (const contactTeacherGroupAccess of access.contactTeacherGroups.filter(entry => !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === entry.schoolNumber))) {
    const contactTeacherGroupAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== contactTeacherGroupAccess.schoolNumber) {
        return false
      }
      return enrollment.contactTeacherGroupMemberships.some((membership) => {
        const membershipPeriod = getPeriodDetails(membership.period, APP_INFO)
        if (!membershipPeriod.active && !membershipPeriod.withinViewAccessWindow) {
          return false
        }
        return membership.contactTeacherGroup.systemId === contactTeacherGroupAccess.systemId
      })
    })
    if (contactTeacherGroupAccessForCurrentStudent) {
      accessTypesForCurrentStudent.push(contactTeacherGroupAccess)
    }
  }

  // No need to check enrollments where already contact teacher group access for that school
  enrollmentsToCheck = enrollmentsToCheck.filter((enrollment) => {
    return !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === enrollment.school.schoolNumber)
  })
  if (enrollmentsToCheck.length === 0) {
    return accessTypesForCurrentStudent
  }
  
  // If school access, no need to check other access types for that school
  for (const classAccess of access.classes.filter(entry => !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === entry.schoolNumber))) {
    const classAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== classAccess.schoolNumber) {
        return false
      }
      return enrollment.classMemberships.some((membership) => {
        const membershipPeriod = getPeriodDetails(membership.period, APP_INFO)
        if (!membershipPeriod.active && !membershipPeriod.withinViewAccessWindow) {
          return false
        }
        return membership.classGroup.systemId === classAccess.systemId
      })
    })
    if (classAccessForCurrentStudent) {
      accessTypesForCurrentStudent.push(classAccess)
    }
  }

  // No need to check enrollments where already class access for that school
  enrollmentsToCheck = enrollmentsToCheck.filter((enrollment) => {
    return !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === enrollment.school.schoolNumber)
  })
  if (enrollmentsToCheck.length === 0) {
    return accessTypesForCurrentStudent
  }

  // If school access, no need to check other access types for that school
  for (const teachingGroupAccess of access.teachingGroups.filter(entry => !accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === entry.schoolNumber))) {
    const teachingGroupAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== teachingGroupAccess.schoolNumber) {
        return false
      }
      return enrollment.teachingGroupMemberships.some((membership) => {
        const membershipPeriod = getPeriodDetails(membership.period, APP_INFO)
        if (!membershipPeriod.active && !membershipPeriod.withinViewAccessWindow) {
          return false
        }
        return membership.teachingGroup.systemId === teachingGroupAccess.systemId
      })
    })
    if (teachingGroupAccessForCurrentStudent) {
      accessTypesForCurrentStudent.push(teachingGroupAccess)
    }
  }

  return accessTypesForCurrentStudent
}
