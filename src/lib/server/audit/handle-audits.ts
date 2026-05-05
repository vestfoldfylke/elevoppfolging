import { logger } from "@vestfoldfylke/loglady"
import { getDbClient } from "$lib/server/db/get-db-client"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AuditEntry, AuditEntryInput, AuditSearchTerms, NewDbAuditEntry } from "$lib/types/db/shared-types"

const dbClient: IDbClient = getDbClient()

export const insertAuditEntry = async (auditEntry: AuditEntryInput, errorMessage: string, errorMessageObject: string | object): Promise<boolean> => {
  if (!auditEntry.created) {
    throw new Error("AuditEntryInput is missing required field 'created'")
  }

  if (auditEntry.action !== "CREATE" && !auditEntry.resourceId) {
    throw new Error("AuditEntryInput is missing 'resourceId' for non-create action!")
  }

  const dbAuditEntry: NewDbAuditEntry = {
    ...auditEntry,
    created: auditEntry.created
  }

  try {
    await dbClient.auditLogs.createAuditEntry(dbAuditEntry)
    return true
  } catch (error) {
    logger.errorException(error, `Failed to create audit entry ${errorMessage}. AuditEntry: {@AuditEntry}`, errorMessageObject, dbAuditEntry)
    return false
  }
}

export const queryAuditEntries = async (searchTerms?: AuditSearchTerms): Promise<AuditEntry[]> => {
  const audits: AuditEntry[] = await dbClient.auditLogs.getAuditEntries(searchTerms)

  return audits.sort((a: AuditEntry, b: AuditEntry) => a.created.at.getTime() - b.created.at.getTime())
}
