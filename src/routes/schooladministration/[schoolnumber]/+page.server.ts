import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { canAccessSchoolAdministration, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { AccessControlClass, AccessControlStudent, PrincipalAccess, PrincipalAccessStudent, SchoolAdministrationManualStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, ProgramArea } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getClassesFromStudents } from "$lib/utils/classes-from-students"
import type { PageServerLoad } from "./$types"

type SchoolAccessAdministrationPageData = {
  manualAccessForSchool: Access[]
  programAreasForSchool: ProgramArea[]
  accessControlSchoolStudents: AccessControlStudent[]
  accessControlSchoolClasses: AccessControlClass[]
  manualSchoolStudents: SchoolAdministrationManualStudent[]
}

const getSchoolAccessAdministrationData: ServerLoadNextFunction<SchoolAccessAdministrationPageData> = async ({ principal, requestEvent }) => {
  const schoolNumber = requestEvent.params.schoolnumber
  if (!schoolNumber) {
    throw new Error("School number is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(404, noAccessMessage("No access found for principal"))
  }

  if (!canAccessSchoolAdministration(principalAccess)) {
    throw new HTTPError(403, noAccessMessage("No permission to access school administration"))
  }

  const manualAccessForSchool: Access[] = await dbClient.access.getManualAccess(schoolNumber)
  const programAreasForSchool: ProgramArea[] = await dbClient.programAreas.getProgramAreasForSchool(schoolNumber)

  const students: PrincipalAccessStudent[] = await getStudentsFromCache(principalAccess, { schoolNumbers: [schoolNumber] })

  const schoolStudentsAvailableForAccessControl: PrincipalAccessStudent[] = students.filter((student) =>
    student.principalAccessForStudent.some((access) => access.type === "MANUELL-SKOLELEDER-TILGANG" && access.schoolNumber === schoolNumber)
  )

  const accessControlSchoolClasses: AccessControlClass[] = getClassesFromStudents(schoolStudentsAvailableForAccessControl)
    .filter((classGroup) => classGroup.school.schoolNumber === schoolNumber)
    .map((classGroup) => ({
      name: classGroup.name,
      systemId: classGroup.systemId
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const accessControlSchoolStudents: AccessControlStudent[] = schoolStudentsAvailableForAccessControl
    .map((student) => ({
      _id: student._id,
      name: student.name,
      feideName: student.feideName,
      source: student.source
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const schoolManualStudents: SchoolAdministrationManualStudent[] = students
    .filter(
      (student) =>
        student.source === "MANUAL" &&
        (student.principalAccessForStudent.some((access) => access.type === "MANUELL-SKOLELEDER-TILGANG" && access.schoolNumber === schoolNumber) ||
          student.principalAccessForStudent.some((access) => access.type === "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG" && access.schoolNumber === schoolNumber))
    )
    .map((student) => ({
      _id: student._id,
      name: student.name,
      feideName: student.feideName,
      hasBlockedAddress: student.hasBlockedAddress
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    data: {
      manualAccessForSchool,
      programAreasForSchool,
      accessControlSchoolStudents,
      accessControlSchoolClasses,
      manualSchoolStudents: schoolManualStudents
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<SchoolAccessAdministrationPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getSchoolAccessAdministrationData)
}
