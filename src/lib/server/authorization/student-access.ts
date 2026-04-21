import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent } from "$lib/types/app-types"

/**
 * Henter ut tilgangene en bruker har til en elev per skole basert på elevens elevforhold og tilgangene i Access-objektet. Tilgangene er sortert på prioritet per skole (høyeste tilgang først).
 */
export const getPrincipalAccessForStudent = (student: CachedFrontendStudent, principalAccess: PrincipalAccess): PrincipalAccessForStudent[] => {
  // Begynner med prioritert tilgang og går nedover derfra. Henter bare høyeste tilgangstype per skole, for å slippe å måtte håndtere flere access entries for samme skole i resten av logikken
  const enrollmentsToCheck = student.enrollmentsWithinViewAccessWindow

  if (enrollmentsToCheck.length === 0) {
    return []
  }

  const principalAccessForCurrentStudent: PrincipalAccessForStudent[] = []

  for (const schoolAccess of principalAccess.leaderForSchools) {
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
  for (const studentAccess of principalAccess.students) {
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

  // Programområde-tilgang
  for (const programAreaAccess of principalAccess.programAreas) {
    enrollmentsToCheck.forEach((enrollment) => {
      if (enrollment.school.schoolNumber !== programAreaAccess.schoolNumber) {
        return
      }
      enrollment.classMemberships.forEach((membership) => {
        if (!membership.period.active && !membership.period.withinViewAccessWindow) {
          return
        }
        if (
          principalAccessForCurrentStudent.some(
            (access) => access.type === "MANUELL-PROGRAMOMRÅDE-TILGANG" && access.accessThroughResource?.id === programAreaAccess._id && access.schoolNumber === programAreaAccess.schoolNumber
          )
        ) {
          // Already added
          return
        }
        if (programAreaAccess.classSystemIds.includes(membership.classGroup.systemId)) {
          principalAccessForCurrentStudent.push({
            type: programAreaAccess.type,
            schoolNumber: programAreaAccess.schoolNumber,
            accessThroughResource: {
              id: programAreaAccess._id,
              name: programAreaAccess.name
            },
            source: programAreaAccess.source
          })
        }
      })
    })
  }

  // Manuell klassetilgang (Rådgiver)
  for (const classAccess of principalAccess.classes.filter((entry) => entry.type === "MANUELL-KLASSE-TILGANG")) {
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
  for (const contactTeacherGroupAccess of principalAccess.contactTeacherGroups) {
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
  for (const classAccess of principalAccess.classes.filter((entry) => entry.type === "AUTOMATISK-KLASSE-TILGANG")) {
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
  for (const teachingGroupAccess of principalAccess.teachingGroups) {
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
