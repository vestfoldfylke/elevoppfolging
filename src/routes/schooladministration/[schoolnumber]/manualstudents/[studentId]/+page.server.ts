import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canManageManualStudentsOnSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppStudent } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type SchoolAdministrationManualStudentManagementPageData = {
  manualStudent: AppStudent
}

const getSchoolAdministrationManualStudentManagementData: ServerLoadNextFunction<SchoolAdministrationManualStudentManagementPageData> = async ({ principal, requestEvent }) => {
  const schoolNumber: string | undefined = requestEvent.params.schoolnumber
  if (!schoolNumber) {
    throw new HTTPError(400, "School number is missing in request parameters")
  }

  const studentId: string | undefined = requestEvent.params.studentId
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(404, noAccessMessage("No access found for principal"))
  }

  if (!canManageManualStudentsOnSchool(access, schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to manage manual students on this school"))
  }

  // NOTE: Needs to be an AppStudent and not just a FrontendStudent since we need SSN
  const manualStudent: AppStudent | null = await dbClient.getManualStudentById(studentId)
  if (!manualStudent) {
    throw new HTTPError(404, "Manual student not found")
  }

  return {
    data: {
      manualStudent
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<SchoolAdministrationManualStudentManagementPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getSchoolAdministrationManualStudentManagementData)
}
