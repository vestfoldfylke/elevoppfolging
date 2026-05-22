import type { Collection, Db } from "mongodb"
import type { IEmailAlertsDbClient } from "$lib/types/db/db-client"
import type { MetricCount, MetricLabel, NewDbEmailAlert } from "$lib/types/db/shared-types"
import { incrementCount, metricResultFailure, metricResultName, metricResultSuccessful } from "../../metrics/handle-metrics"

export class EmailAlertsDbClient implements IEmailAlertsDbClient {
  private emailAlertsCollection: Collection<NewDbEmailAlert>

  constructor(db: Db) {
    this.emailAlertsCollection = db.collection<NewDbEmailAlert>("email-alerts")
  }

  async createEmailAlert(emailAlert: NewDbEmailAlert): Promise<string> {
    const result = await this.emailAlertsCollection.insertOne(emailAlert)

    const metricBody: MetricCount = {
      name: "EmailAlert_Create",
      description: "Number of email alerts created"
    }
    const labels: MetricLabel[] = [["type", emailAlert.type]]

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create email alert")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    return result.insertedId.toString()
  }
}
