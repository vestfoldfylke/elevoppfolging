import type { FrontendOverviewStudent, PrincipalAccessStudent } from "$lib/types/app-types"
import type { Access, SchoolLeaderManualAccessEntry, StudentClassGroup } from "$lib/types/db/shared-types"

export const getClassesFromStudents = (students: PrincipalAccessStudent[]): StudentClassGroup[] => {
  const classes = new Map<string, StudentClassGroup>()

  for (const student of students) {
    for (const enrollment of student.enrollmentsWithinViewAccessWindow) {
      for (const classMembership of enrollment.classMemberships) {
        if (!classes.has(classMembership.classGroup.systemId)) {
          classes.set(classMembership.classGroup.systemId, {
            ...classMembership.classGroup,
            school: enrollment.school
          })
        }
      }
    }
  }

  return Array.from(classes.values())
}

export const getAccessibleClassesFromStudents = (principalAccess: Access, students: FrontendOverviewStudent[]): StudentClassGroup[] => {
  const classes = new Map<string, StudentClassGroup>()

  for (const student of students) {
    if (student.enrollmentsWithinViewAccessWindow.length === 0) {
      continue
    }

    for (const studentEnrollment of student.enrollmentsWithinViewAccessWindow) {
      if (principalAccess.leaderForSchools.some((leaderEntry: SchoolLeaderManualAccessEntry) => leaderEntry.schoolNumber === studentEnrollment.school.schoolNumber)) {
        studentEnrollment.classMemberships.forEach((classMembership) => {
          if (!classes.has(classMembership.classGroup.systemId)) {
            classes.set(classMembership.classGroup.systemId, {
              ...classMembership.classGroup,
              school: studentEnrollment.school
            })
          }
        })

        continue
      }

      if (studentEnrollment.classMemberships.length === 0) {
        continue
      }

      const regularAccess = studentEnrollment.classMemberships.filter((classMembership) => principalAccess.classes.find((classEntry) => classEntry.systemId === classMembership.classGroup.systemId))
      if (regularAccess.length === 0) {
        continue
      }

      regularAccess.forEach((classMembership) => {
        if (!classes.has(classMembership.classGroup.systemId)) {
          classes.set(classMembership.classGroup.systemId, {
            ...classMembership.classGroup,
            school: studentEnrollment.school
          })
        }
      })
    }
  }

  return Array.from(classes.values())
}
