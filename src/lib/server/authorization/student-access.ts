import type { AccessEntry, CachedFrontendStudent } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"

/**
 * Henter ut høyeste tilgangstype for en elev per skole basert på elevens elevforhold og tilgangene i Access-objektet. Hvis eleven har flere elevforhold på en skole, vil den høyeste tilgangstypen blant disse bli returnert.
 */
export const getPrincipalAccessEntriesForStudent = (student: CachedFrontendStudent, access: Access): AccessEntry[] => {
  // Begynner med prioritert tilgang og går nedover derfra. Henter bare høyeste tilgangstype per skole, for å slippe å måtte håndtere flere access entries for samme skole i resten av logikken
  let enrollmentsToCheck = student.enrollmentsWithinViewAccessWindow

  if (enrollmentsToCheck.length === 0) {
    return []
  }

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

  // Direkte elev-tilgang
  for (const studentAccess of access.students) {
    if (student._id !== studentAccess._id) {
      continue
    }
    if (accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === studentAccess.schoolNumber)) {
      continue
    }
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

  // Manuell klassetilgang (Rådgiver)
  for (const classAccess of access.classes.filter((entry) => entry.type === "MANUELL-KLASSE-TILGANG")) {
    if (accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === classAccess.schoolNumber)) {
      continue
    }
    const classAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== classAccess.schoolNumber) {
        return false
      }
      return enrollment.classMemberships.some((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
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

  // Kontaktlærer-tilgang
  for (const contactTeacherGroupAccess of access.contactTeacherGroups) {
    if (accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === contactTeacherGroupAccess.schoolNumber)) {
      continue
    }

    const contactTeacherGroupAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== contactTeacherGroupAccess.schoolNumber) {
        return false
      }
      return enrollment.contactTeacherGroupMemberships.some((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
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

  // Klassetilgang (Automatisk - bare lærer)
  for (const classAccess of access.classes.filter((entry) => entry.type === "AUTOMATISK-KLASSE-TILGANG")) {
    if (accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === classAccess.schoolNumber)) {
      continue
    }
    const classAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== classAccess.schoolNumber) {
        return false
      }
      return enrollment.classMemberships.some((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
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
  for (const teachingGroupAccess of access.teachingGroups) {
    if (accessTypesForCurrentStudent.some((accessType) => accessType.schoolNumber === teachingGroupAccess.schoolNumber)) {
      continue
    }
    const teachingGroupAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      if (enrollment.school.schoolNumber !== teachingGroupAccess.schoolNumber) {
        return false
      }
      return enrollment.teachingGroupMemberships.some((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
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
