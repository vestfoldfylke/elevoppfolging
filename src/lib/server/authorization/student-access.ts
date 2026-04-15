import type { CachedFrontendStudent, PrincipalAccessForStudent } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"

/**
 * Henter ut tilgangene en bruker har til en elev per skole basert på elevens elevforhold og tilgangene i Access-objektet. Tilgangene er sortert på prioritet per skole (høyeste tilgang først).
 */
export const getPrincipalAccessForStudent = (student: CachedFrontendStudent, access: Access): PrincipalAccessForStudent[] => {
  // Begynner med prioritert tilgang og går nedover derfra. Henter bare høyeste tilgangstype per skole, for å slippe å måtte håndtere flere access entries for samme skole i resten av logikken
  const enrollmentsToCheck = student.enrollmentsWithinViewAccessWindow

  if (enrollmentsToCheck.length === 0) {
    return []
  }

  const principalAccessForCurrentStudent: PrincipalAccessForStudent[] = []

  for (const schoolAccess of access.leaderForSchools) {
    const schoolAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => {
      return enrollment.school.schoolNumber === schoolAccess.schoolNumber
    })
    if (schoolAccessForCurrentStudent) {
      principalAccessForCurrentStudent.push({
        type: schoolAccess.type,
        schoolNumber: schoolAccess.schoolNumber,
        accessThroughResource: null,
        source: schoolAccess.source
      })
    }
  }

  // Direkte elev-tilgang
  for (const studentAccess of access.students) {
    if (student._id !== studentAccess._id) {
      continue
    }
    const studentAccessForCurrentStudent = enrollmentsToCheck.some((enrollment) => enrollment.school.schoolNumber === studentAccess.schoolNumber)
    if (studentAccessForCurrentStudent) {
      principalAccessForCurrentStudent.push({
        type: studentAccess.type,
        schoolNumber: studentAccess.schoolNumber,
        accessThroughResource: null,
        source: studentAccess.source
      })
    }
  }

  // TODO - programområder / programAreas når vi har en cache på det for å slippe drittoppslag hele tida (ta de inn som parameter)

  // Manuell klassetilgang (Rådgiver)
  for (const classAccess of access.classes.filter((entry) => entry.type === "MANUELL-KLASSE-TILGANG")) {
    enrollmentsToCheck.forEach((enrollment) => {
      if (enrollment.school.schoolNumber !== classAccess.schoolNumber) {
        return
      }
      enrollment.classMemberships.forEach((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
          return
        }
        if (membership.classGroup.systemId === classAccess.systemId) {
          principalAccessForCurrentStudent.push({
            type: classAccess.type,
            schoolNumber: classAccess.schoolNumber,
            accessThroughResource: {
              id: membership.classGroup.systemId,
              name: membership.classGroup.name
            },
            source: classAccess.source
          })
        }
      })
    })
  }

  // Kontaktlærer-tilgang
  for (const contactTeacherGroupAccess of access.contactTeacherGroups) {
    enrollmentsToCheck.forEach((enrollment) => {
      if (enrollment.school.schoolNumber !== contactTeacherGroupAccess.schoolNumber) {
        return
      }
      enrollment.contactTeacherGroupMemberships.forEach((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
          return
        }
        if (membership.contactTeacherGroup.systemId === contactTeacherGroupAccess.systemId) {
          principalAccessForCurrentStudent.push({
            type: contactTeacherGroupAccess.type,
            schoolNumber: contactTeacherGroupAccess.schoolNumber,
            accessThroughResource: {
              id: membership.contactTeacherGroup.systemId,
              name: membership.contactTeacherGroup.name
            },
            source: contactTeacherGroupAccess.source
          })
        }
      })
    })
  }

  // Klassetilgang (Automatisk - bare lærer)
  for (const classAccess of access.classes.filter((entry) => entry.type === "AUTOMATISK-KLASSE-TILGANG")) {
    enrollmentsToCheck.forEach((enrollment) => {
      if (enrollment.school.schoolNumber !== classAccess.schoolNumber) {
        return
      }
      enrollment.classMemberships.forEach((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
          return
        }
        if (membership.classGroup.systemId === classAccess.systemId) {
          principalAccessForCurrentStudent.push({
            type: classAccess.type,
            schoolNumber: classAccess.schoolNumber,
            accessThroughResource: {
              id: membership.classGroup.systemId,
              name: membership.classGroup.name
            },
            source: classAccess.source
          })
        }
      })
    })
  }

  // Faglærer
  for (const teachingGroupAccess of access.teachingGroups) {
    enrollmentsToCheck.forEach((enrollment) => {
      if (enrollment.school.schoolNumber !== teachingGroupAccess.schoolNumber) {
        return
      }
      enrollment.teachingGroupMemberships.forEach((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
          return
        }
        if (membership.teachingGroup.systemId === teachingGroupAccess.systemId) {
          principalAccessForCurrentStudent.push({
            type: teachingGroupAccess.type,
            schoolNumber: teachingGroupAccess.schoolNumber,
            accessThroughResource: {
              id: membership.teachingGroup.systemId,
              name: membership.teachingGroup.name
            },
            source: teachingGroupAccess.source
          })
        }
      })
    })
  }

  return principalAccessForCurrentStudent
}
