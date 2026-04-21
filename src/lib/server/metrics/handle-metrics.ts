import { count, gauge } from "@vestfoldfylke/vestfold-metrics"
import type { MetricCount, MetricGauge } from "$lib/types/db/shared-types"

const metricNamePrefix = "Elevoppfolging_"

export const metricResultName: string = "result"
export const metricResultSuccessful: string = "successful"
export const metricResultFailure: string = "failure"

export const updateGauge = (metricGauge: MetricGauge): void => {
  const metricName: string = `${metricNamePrefix}${metricGauge.name}`

  if (metricGauge.labels && metricGauge.labels.length > 0) {
    gauge(metricName, metricGauge.description, metricGauge.value, ...metricGauge.labels)
    return
  }

  gauge(metricName, metricGauge.description, metricGauge.value)
}

export const incrementCount = (metricCount: MetricCount): void => {
  const metricName: string = `${metricNamePrefix}${metricCount.name}`

  if (metricCount.labels && metricCount.labels.length > 0) {
    count(metricName, metricCount.description, ...metricCount.labels)
    return
  }

  count(metricName, metricCount.description)
}
