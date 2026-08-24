import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getFrontendOverviewStudents } from "$lib/server/get-frontend-overview-students"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendOverviewStudentFilter, PrincipalAccess } from "$lib/types/app-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type GetStudentsResponse = ApiRouteMap[`/api/students${NoSlashString}`]["GET"]["res"]

const getStudents: ApiNextFunction<GetStudentsResponse, void> = async ({ principal, requestEvent }) => {
  const sortBy = requestEvent.url.searchParams.get("sortBy")
  const sortDirection = requestEvent.url.searchParams.get("sortDirection")

  const validSortByValues: FrontendOverviewStudentFilter["sortBy"][] = ["studentName", "className", "contactTeacherName", "lastActivity"]
  const validSortDirectionValues: FrontendOverviewStudentFilter["sortDirection"][] = ["ascending", "descending"]

  if (sortBy && !validSortByValues.includes(sortBy as FrontendOverviewStudentFilter["sortBy"])) {
    throw new HTTPError(400, `Invalid sortBy value. Valid values are: ${validSortByValues.join(", ")}`)
  }

  if (sortDirection && !validSortDirectionValues.includes(sortDirection as FrontendOverviewStudentFilter["sortDirection"])) {
    throw new HTTPError(400, `Invalid sortDirection value. Valid values are: ${validSortDirectionValues.join(", ")}`)
  }

  const hasNoDocuments = requestEvent.url.searchParams.get("hasNoDocuments") === "true" ? true : undefined

  const studentFilter: FrontendOverviewStudentFilter = {
    studentName: requestEvent.url.searchParams.get("studentName") || undefined,
    className: requestEvent.url.searchParams.get("className") || undefined,
    contactTeacherName: requestEvent.url.searchParams.get("contactTeacherName") || undefined,
    studentCheckBoxIds: requestEvent.url.searchParams.getAll("studentCheckBoxIds"),
    templateIds: requestEvent.url.searchParams.getAll("templateIds"),
    hasNoDocuments,
    sortBy: (sortBy as FrontendOverviewStudentFilter["sortBy"]) || undefined,
    sortDirection: (sortDirection as FrontendOverviewStudentFilter["sortDirection"]) || undefined,
    top: Number(requestEvent.url.searchParams.get("top")) || undefined
  }

  // Check that not both hasNoDocuments and templateIds filters are applied at the same time, as this is not supported
  if (studentFilter.hasNoDocuments && studentFilter.templateIds && studentFilter.templateIds.length > 0) {
    throw new HTTPError(400, "Cannot apply both hasNoDocuments and templateIds filters at the same time, as this is not supported")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    logger.info("No access found for principal returning no students")
    return {
      students: [],
      totalStudentCount: 0
    }
  }

  return await getFrontendOverviewStudents(principalAccess, studentFilter)
}

export const GET: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<GetStudentsResponse, void>(requestEvent, getStudents)
}
