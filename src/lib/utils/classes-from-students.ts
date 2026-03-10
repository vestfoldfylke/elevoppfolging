import type { CachedFrontendStudentWithAccessInfo } from "$lib/types/app-types"
import type { ClassGroup } from "$lib/types/db/shared-types"

export const getClassesFromStudents = (students: CachedFrontendStudentWithAccessInfo[]): (ClassGroup & { schoolNumber: string })[] => {
  const classes = new Map<string, ClassGroup & { schoolNumber: string }>()
  for (const student of students) {
    for (const enrollment of student.studentEnrollments) {
      for (const classMembership of enrollment.classMemberships) {
        if (!classes.has(classMembership.classGroup.systemId)) {
          classes.set(classMembership.classGroup.systemId, { ...classMembership.classGroup, schoolNumber: enrollment.school.schoolNumber })
        }
      }
    }
  }
  return Array.from(classes.values())
}
