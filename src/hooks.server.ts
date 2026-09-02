import type { ServerInit } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { updateStudentsCache } from "$lib/server/cache/students-cache"
import { updateAppUserCache } from "$lib/server/cache/users-cache"
import { getDbClient } from "$lib/server/db/get-db-client.js"
import { createInfoGauges } from "$lib/server/metrics/handle-metrics.js"
import type { IDbClient } from "$lib/types/db/db-client.js"
import type { DocumentContentTemplate, MetricGauge } from "$lib/types/db/shared-types.js"
import { metricsDocumentTemplateIdLabelName, metricsDocumentTemplateInfoDescription, metricsDocumentTemplateInfoName, metricsDocumentTemplateNameLabelName } from "$lib/utils/metric-constants.js"

const createDocumentContentTemplateGauges = async (): Promise<void> => {
  const dbClient: IDbClient = getDbClient()
  const documentContentTemplates: DocumentContentTemplate[] = await dbClient.documentContentTemplates.getDocumentContentTemplates()
  const documentContentTemplateGauges: MetricGauge[] = []

  for (const documentContentTemplate of documentContentTemplates) {
    documentContentTemplateGauges.push({
      name: documentContentTemplate.name, // NOTE: This isn't actually used, but required in type
      description: metricsDocumentTemplateInfoDescription,
      value: 1,
      labels: [
        [metricsDocumentTemplateIdLabelName, documentContentTemplate._id],
        [metricsDocumentTemplateNameLabelName, documentContentTemplate.name]
      ]
    })
  }

  createInfoGauges(metricsDocumentTemplateInfoName, documentContentTemplateGauges)
}

export const init: ServerInit = async () => {
  logger.info("Initializing server and populating students and users caches")

  try {
    await Promise.all([updateStudentsCache(), updateAppUserCache()])
  } catch (error) {
    logger.errorException(error, "Error populating caches during server initialization, application is probably unusable until this is fixed")
  }

  logger.info("Initializing server and registering document template info gauges")
  await createDocumentContentTemplateGauges()

  logger.info("Finished initializing server")
}
