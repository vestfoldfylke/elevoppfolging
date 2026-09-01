import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { PrincipalAccess, PrincipalAccessStudent, PrincipalAccessStudentClassGroup } from "$lib/types/app-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getPrincipalAccessClassesFromStudents } from "$lib/utils/classes-from-students"
import type { PageServerLoad } from "./$types"

type ClassesPageData = {
  principalClasses: PrincipalAccessStudentClassGroup[]
}

const getClassGroups: ServerLoadNextFunction<ClassesPageData> = async ({ principal }) => {
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    return {
      principalClasses: []
    }
  }

  const principalStudents: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)

  const principalClasses: PrincipalAccessStudentClassGroup[] = getPrincipalAccessClassesFromStudents(principalAccess, principalStudents)

  return {
    principalClasses
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<ClassesPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getClassGroups)
}
