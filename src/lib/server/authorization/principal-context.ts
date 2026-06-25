import { getStudentFromCache, getStudentsFromCache } from "$lib/server/cache/students-cache"
import { HTTPError } from "$lib/server/middleware/http-error"
import type { CachedFrontendStudent, PrincipalAccess, PrincipalAccessForStudent, PrincipalAccessStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { StudentClassGroup } from "$lib/types/db/shared-types"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"
import { getPrincipalAccess } from "./principal-access"
import { getPrincipalAccessForStudent } from "./student-access"

export async function resolvePrincipalAccess(principal: AuthenticatedPrincipal): Promise<PrincipalAccess> {
  const principalAccess = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }
  return principalAccess
}

type StudentContext = {
  principalAccess: PrincipalAccess
  student: CachedFrontendStudent
  principalAccessForStudent: PrincipalAccessForStudent[]
}

export async function resolveStudentContext(principal: AuthenticatedPrincipal, studentId: string): Promise<StudentContext> {
  const principalAccess = await resolvePrincipalAccess(principal)

  const student = await getStudentFromCache(studentId)
  if (!student) {
    throw new HTTPError(404, "Elev ikke funnet")
  }

  const principalAccessForStudent = getPrincipalAccessForStudent(student, principalAccess)
  if (principalAccessForStudent.length === 0) {
    throw new HTTPError(403, "Ingen tilgang til eleven")
  }

  return { principalAccess, student, principalAccessForStudent }
}

type ClassContext = {
  principalAccess: PrincipalAccess
  students: PrincipalAccessStudent[]
  classes: StudentClassGroup[]
  classGroup: StudentClassGroup
}

export async function resolveClassContext(principal: AuthenticatedPrincipal, systemId: string): Promise<ClassContext> {
  const principalAccess = await resolvePrincipalAccess(principal)

  const students = await getStudentsFromCache(principalAccess)
  if (students.length === 0) {
    throw new HTTPError(404, "Ingen tilgang til klassen")
  }

  const classes = getAccessibleClassesFromStudents(principalAccess, students)
  if (classes.length === 0) {
    throw new HTTPError(404, "Ingen tilgang til klassen")
  }

  const classGroup = classes.find((classEntry) => classEntry.systemId === systemId)
  if (!classGroup) {
    throw new HTTPError(404, "Ingen tilgang til klassen")
  }

  return { principalAccess, students, classes, classGroup }
}
