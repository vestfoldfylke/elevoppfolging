import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { getStudentsFromCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { PrincipalAccess, PrincipalAccessStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { DocumentContentTemplate, GroupDocument, GroupImportantStuff, StudentClassGroup } from "$lib/types/db/shared-types"
import type { ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getAccessibleClassesFromStudents } from "$lib/utils/classes-from-students"
import type { PageServerLoad } from "./$types"

type ClassPageData = {
  classGroup: StudentClassGroup
  classStudents: PrincipalAccessStudent[]
  groupImportantStuff: GroupImportantStuff[]
  documents: GroupDocument[]
  documentContentTemplates: DocumentContentTemplate[]
}

const getClassGroup: ServerLoadNextFunction<ClassPageData> = async ({ principal, requestEvent }) => {
  const systemId: string | undefined = requestEvent.params.system_id
  if (!systemId) {
    throw new Error("System ID is missing in request parameters")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }

  const classStudents = await getStudentsFromCache(principalAccess, { classSystemIds: [systemId] })

  if (classStudents.length === 0) {
    throw new HTTPError(403, "Ingen tilgang til noen elever i denne klassen")
  }

  const principalClasses: StudentClassGroup[] = getAccessibleClassesFromStudents(principalAccess, classStudents)

  const classGroup = principalClasses.find((classEntry) => classEntry.systemId === systemId)

  if (!classGroup) {
    throw new HTTPError(403, "Ingen tilgang til denne klassen")
  }

  const dbClient: IDbClient = getDbClient()

  const groupImportantStuff: GroupImportantStuff[] = await dbClient.importantStuff.getGroupImportantStuff(systemId)

  const groupDocuments: GroupDocument[] = await dbClient.documents.getGroupDocuments(systemId)

  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.documentContentTemplates.getDocumentContentTemplates({ group: true })

  return {
    classGroup,
    classStudents,
    groupImportantStuff,
    documents: groupDocuments,
    documentContentTemplates: documentContentTemplates.sort((a, b) => a.sort - b.sort)
  }
}

export const load: PageServerLoad = async (requestEvent): Promise<ClassPageData> => {
  return await serverLoadRequestMiddleware(requestEvent, getClassGroup)
}
