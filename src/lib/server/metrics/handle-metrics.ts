import { count, gauge, removeGauge } from "@vestfoldfylke/vestfold-metrics"
import type { MetricCount, MetricGauge, MetricLabel } from "$lib/types/db/shared-types"

const metricNamePrefix = "Elevoppfolging_"

export const metricResultName: string = "result"
export const metricResultSuccessful: string = "successful"
export const metricResultFailure: string = "failure"

export const updateGauge = (metricGauge: MetricGauge, metricName?: string): void => {
  const _metricName: string = metricName ?? `${metricNamePrefix}${metricGauge.name}`
  if (!_metricName.startsWith(metricNamePrefix)) {
    throw new Error(`Metric name MUST start with "${metricNamePrefix}"`)
  }

  if (metricGauge.labels && metricGauge.labels.length > 0) {
    gauge(_metricName, metricGauge.description, metricGauge.value, ...metricGauge.labels)
    return
  }

  gauge(_metricName, metricGauge.description, metricGauge.value)
}

export const incrementCount = (metricCount: MetricCount): void => {
  const metricName: string = `${metricNamePrefix}${metricCount.name}`

  if (metricCount.labels && metricCount.labels.length > 0) {
    count(metricName, metricCount.description, ...metricCount.labels)
    return
  }

  count(metricName, metricCount.description)
}

export const createInfoGauges = (metricName: string, metricGauges: MetricGauge[]): void => {
  for (const metricGauge of metricGauges) {
    updateGauge(metricGauge, `${metricNamePrefix}${metricName}`)
  }
}

export const removeInfoGauge = (metricName: string, metricLabels?: MetricLabel[]): void => {
  const _metricName: string = `${metricNamePrefix}${metricName}`

  if (metricLabels) {
    removeGauge(_metricName, ...metricLabels)
    return
  }

  removeGauge(_metricName)
}
