import type { PrincipalAccess, PrincipalAccessStudent, StudentClassGroupAccess } from "$lib/types/app-types"
import type { StudentClassGroup } from "$lib/types/db/shared-types"

export const getClassesFromStudents = (students: PrincipalAccessStudent[]): StudentClassGroup[] => {
  const classes = new Map<string, StudentClassGroup>()

  for (const student of students) {
    const enrollmentsToCheck = student.enrollmentsWithinViewAccessWindow.filter((enrollment) =>
      student.principalAccessForStudent.some((access) => access.schoolNumber === enrollment.school.schoolNumber)
    )

    for (const enrollment of enrollmentsToCheck) {
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

export const getPrincipalAccessForClass = (principalAccess: PrincipalAccess, classGroup: StudentClassGroup): StudentClassGroupAccess => {
  const schools = principalAccess.leaderForSchools.filter((entry) => entry.schoolNumber === classGroup.school.schoolNumber)
  const allStudentsAtSchoolEntries = principalAccess.allStudentsAtSchools.filter((entry) => entry.schoolNumber === classGroup.school.schoolNumber)
  const classEntries = principalAccess.classes.filter((entry) => entry.systemId === classGroup.systemId)
  const programAreas = principalAccess.programAreas.filter((entry) => entry.classSystemIds.includes(classGroup.systemId))

  const onlyAccessViaStudentAccess = schools.length === 0 && allStudentsAtSchoolEntries.length === 0 && classEntries.length === 0 && programAreas.length === 0

  return { schools, allStudentsAtSchoolEntries, classEntries, programAreas, onlyAccessViaStudentAccess }
}
