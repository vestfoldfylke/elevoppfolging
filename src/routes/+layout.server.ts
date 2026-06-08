import { logger } from "@vestfoldfylke/loglady"
import { APP_INFO } from "$lib/server/app-info"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { DocumentTemplateFilterOption, PrincipalAccess, RootLayoutData } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { SchoolInfo } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { LayoutServerLoad } from "./$types"

const layoutLoad: ServerLoadNextFunction<RootLayoutData> = async ({ principal }) => {
  const dbClient: IDbClient = getDbClient()

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)

  if (!principalAccess) {
    logger.info(`No access entry found for user ${principal.id}, but apparently have access through entra, quick return with no students, schools or anything`)
    return {
      authenticatedPrincipal: principal,
      APP_INFO,
      principalAccess,
      studentCheckBoxes: [],
      documentTemplateFilterOptions: [],
      schools: []
    }
  }

  logger.info("Fetching student check boxes")
  const studentCheckBoxes = await dbClient.studentCheckBoxes.getStudentCheckBoxes()
  logger.info(`Found ${studentCheckBoxes.length} student check boxes`)

  logger.info("Fetching schools")
  const schoolsFromDb = await dbClient.schools.getSchools()
  const schoolsInfo: SchoolInfo[] = schoolsFromDb.map((school) => ({
    name: school.name,
    schoolNumber: school.schoolNumber
  }))
  logger.info(`Found ${schoolsFromDb.length} schools`)

  logger.info("Fetching student document templates")
  const documentTemplateFilterOptions: DocumentTemplateFilterOption[] = (await dbClient.documentContentTemplates.getDocumentContentTemplates({ student: true })).map(({ _id, name }) => ({ _id, name }))
  logger.info(`Found ${documentTemplateFilterOptions.length} document content templates`)

  return {
    authenticatedPrincipal: principal,
    APP_INFO,
    principalAccess,
    documentTemplateFilterOptions,
    studentCheckBoxes: studentCheckBoxes.sort((a, b) => a.sort - b.sort),
    schools: schoolsInfo
  }
}

export const load: LayoutServerLoad = async (requestEvent): Promise<RootLayoutData> => {
  return serverLoadRequestMiddleware(requestEvent, layoutLoad)
}
