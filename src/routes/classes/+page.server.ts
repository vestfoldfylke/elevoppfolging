import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { StudentClassGroup } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"
import type { PageServerLoad } from "./$types"

type ClassesPageData = {
  principalClasses: StudentClassGroup[]
}

const getClassGroups: ServerLoadNextFunction<ClassesPageData> = async ({ principal }) => {
  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    return {
      data: {
        principalClasses: []
      },
      isAuthorized: true,
    }
  }

  const principalStudents: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess)

  const principalClasses: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, principalStudents)

  return {
    data: {
      principalClasses
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<ClassesPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getClassGroups)
}
