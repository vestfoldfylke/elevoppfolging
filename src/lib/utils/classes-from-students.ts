import type { PrincipalAccess, PrincipalAccessStudent, PrincipalAccessStudentClassGroup } from "$lib/types/app-types"
import type { StudentClassGroup } from "$lib/types/db/shared-types"

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

export const getPrincipalAccessClassesFromStudents = (principalAccess: PrincipalAccess, students: PrincipalAccessStudent[]): PrincipalAccessStudentClassGroup[] => {
  const classes = new Map<string, PrincipalAccessStudentClassGroup>()

  for (const student of students) {
    if (student.enrollmentsWithinViewAccessWindow.length === 0) {
      continue
    }

    const enrollmentsToCheck = student.enrollmentsWithinViewAccessWindow.filter(enrollment => {
      return student.principalAccessForStudent.some(access => access.schoolNumber === enrollment.school.schoolNumber && access.type !== "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG")
    })

    for (const studentEnrollment of enrollmentsToCheck) {
      // If access to a student at a school - access to view that class
      studentEnrollment.classMemberships.forEach((classMembership) => {
        // If we handled this specific class before - no need to do it again
        const classKey = `${studentEnrollment.school.schoolNumber}-${classMembership.classGroup.systemId}`
        if (classes.has(classKey)) {
          return
        }

        classes.set(classKey, {
          ...classMembership.classGroup,
          school: studentEnrollment.school,
          principalAccessForStudentClassGroup: {
            allStudentsAtSchoolEntries: [],
            classEntries: [],
            programAreas: [],
            schools: [],
            onlyAccessViaStudentAccess: true // initial weakest access
          }
        })


        const currentClassGroup = classes.get(classKey) as PrincipalAccessStudentClassGroup // Map.prototype.getOrInsert() available in Node 26, so just do it stupid here

        // Then populate access for that class
        const schoolLeaderEntry = principalAccess.leaderForSchools.find(leaderForSchoolAccessEntry => leaderForSchoolAccessEntry.schoolNumber === currentClassGroup.school.schoolNumber)
        if (schoolLeaderEntry) {
          currentClassGroup.principalAccessForStudentClassGroup.schools.push(schoolLeaderEntry)
        }

        const allStudentsAtSchoolEntry = principalAccess.allStudentsAtSchools.find(allStudentsAtSchoolAccessEntry => allStudentsAtSchoolAccessEntry.schoolNumber === currentClassGroup.school.schoolNumber)
        if (allStudentsAtSchoolEntry) {
          currentClassGroup.principalAccessForStudentClassGroup.allStudentsAtSchoolEntries.push(allStudentsAtSchoolEntry)
        }

        currentClassGroup.principalAccessForStudentClassGroup.classEntries = principalAccess.classes.filter(classGroup => classGroup.systemId === currentClassGroup.systemId)

        currentClassGroup.principalAccessForStudentClassGroup.programAreas = principalAccess.programAreas.filter(programArea => programArea.classSystemIds.includes(currentClassGroup.systemId))
        
        // Check if any of the arrays has items, if so - there exists a "full class" access through one of the types above
        Object.values(currentClassGroup.principalAccessForStudentClassGroup).forEach((value) => {
          if (!Array.isArray(value)) {
            return
          }

          if (value.length > 0) {
            currentClassGroup.principalAccessForStudentClassGroup.onlyAccessViaStudentAccess = false
          }
        })
      })
    }
  }

  return Array.from(classes.values())
}
