import { logger } from "@vestfoldfylke/loglady"
import type { Collection, Db, Filter, InsertOneResult, WithId } from "mongodb"
import type { IAuditLogsDbClient } from "$lib/types/db/db-client"
import type { AuditEntry, AuditEntryInput, AuditSearchTerms } from "$lib/types/db/shared-types"
import { getDateDaysAhead, getDateDaysBack, getDateValue, getEndOfDate, getStartOfDate } from "$lib/utils/dates"

export class AuditLogsDbClient implements IAuditLogsDbClient {
  private auditLogsCollection: Collection<AuditEntryInput>

  constructor(db: Db) {
    this.auditLogsCollection = db.collection<AuditEntryInput>("audits")
  }

  async createAuditEntry(auditEntry: AuditEntryInput): Promise<string> {
    const result: InsertOneResult<AuditEntryInput> = await this.auditLogsCollection.insertOne(auditEntry)

    if (!result.insertedId) {
      throw new Error("Failed to insert auditEntry")
    }

    const insertedId: string = result.insertedId.toString()
    logger.info("Created audit entry for {Action} {Resource} with ResourceId {ResourceId}. AuditEntryId: {AuditEntryId}", auditEntry.action, auditEntry.resource, auditEntry.resourceId, insertedId)

    return insertedId
  }

  async getAuditEntries(searchTerms?: AuditSearchTerms): Promise<AuditEntry[]> {
    const auditLogs: WithId<AuditEntryInput>[] = await this.auditLogsCollection.find(this.getAuditLogsFilter(searchTerms)).toArray()
    logger.info("Found {AuditEntryCount} audit entries", auditLogs.length)

    return auditLogs.map((auditLog: WithId<AuditEntryInput>) => {
      return {
        ...auditLog,
        _id: auditLog._id.toString()
      }
    })
  }

  private getAuditLogsFilter(searchTerms?: AuditSearchTerms): Filter<AuditEntryInput> {
    const isEmptyOrDefault: boolean =
      !searchTerms ||
      (searchTerms.timeFrame.from === getDateValue(new Date()) &&
        searchTerms.timeFrame.to === getDateValue(getDateDaysAhead(7)) &&
        searchTerms.action === "" &&
        searchTerms.resource === "" &&
        searchTerms.user === "")

    // NOTE: TypeScript doesn't understand that searchTerms is handled above, so we need to check it here as well....
    if (!searchTerms || isEmptyOrDefault) {
      return {
        "created.at": {
          $gte: getStartOfDate(getDateDaysBack(7)) // default to last 7 days
        }
      }
    }

    const filter: Filter<AuditEntryInput> = {
      "created.at": {
        $gte: getStartOfDate(new Date(searchTerms.timeFrame.from)),
        $lte: getEndOfDate(new Date(searchTerms.timeFrame.to))
      }
    }

    if (searchTerms.action !== "") {
      filter.action = searchTerms.action
    }

    if (searchTerms.resource !== "") {
      filter.resource = searchTerms.resource
    }

    if (searchTerms.user !== "") {
      filter["created.by.fallbackName"] = {
        $regex: searchTerms.user,
        $options: "i"
      }
    }

    return filter
  }
}
