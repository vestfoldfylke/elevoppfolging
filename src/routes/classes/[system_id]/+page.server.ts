import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import { noAccessMessage } from "$lib/shared-authorization/authorization"
import type { PrincipalAccess } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate, GroupImportantStuff, StudentDocument } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { PageServerLoad } from "./$types"

type ClassPageData = {
  groupImportantStuff: GroupImportantStuff[]
  documents: StudentDocument[]
  documentContentTemplates: DocumentContentTemplate[]
}

const getClass: ServerLoadNextFunction<ClassPageData> = async ({ principal, requestEvent }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new Error("System ID is missing in request parameters")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  const dbClient: IDbClient = getDbClient()

  const groupImportantStuff: GroupImportantStuff[] = await dbClient.getGroupImportantStuff(systemId)

  //const allStudentDocuments: StudentDocument[] = await dbClient.getStudentDocuments(systemId)

  //const documents = allStudentDocuments.filter((document) => canViewStudentDocument(principal, principalAccessForStudent, document, studentDataSharingConsent))

  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.getDocumentContentTemplates({ student: false, group: true })

  return {
    data: {
      groupImportantStuff,
      documents: [],
      documentContentTemplates: documentContentTemplates.sort((a, b) => a.sort - b.sort)
    },
    isAuthorized: true
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<ClassPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getClass)
}
