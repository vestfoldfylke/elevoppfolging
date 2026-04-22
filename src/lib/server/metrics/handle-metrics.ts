import { count, gauge } from "@vestfoldfylke/vestfold-metrics"
import type { MetricCount, MetricGauge, MetricLabel } from "$lib/types/db/shared-types"

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
  if (handleCountSplitMetricByLabels(metricCount)) {
    return
  }

  const metricName: string = `${metricNamePrefix}${metricCount.name}`

  if (metricCount.labels && metricCount.labels.length > 0) {
    count(metricName, metricCount.description, ...metricCount.labels)
    return
  }

  count(metricName, metricCount.description)
}

const handleCountSplitMetricByLabels = (metricCount: MetricCount): boolean => {
  if (metricCount.splitMetricByLabels === undefined || !metricCount.splitMetricByLabels) {
    return false
  }

  const customMetricLabels: MetricLabel[] = metricCount.labels?.filter((label: MetricLabel) => label[0] !== metricResultName) || []

  if (customMetricLabels.length === 0) {
    return false
  }

  const resultMetricLabel: MetricLabel | undefined = metricCount.labels?.find((label: MetricLabel) => label[0] === metricResultName)

  customMetricLabels.forEach((label: MetricLabel) => {
    const metricName: string = `${metricNamePrefix}${metricCount.name}_By_${label[0]}`
    const metricDescription: string = `${metricCount.description} for ${label[0]}`

    if (metricCount.includeLabelsInSplit === undefined || metricCount.includeLabelsInSplit) {
      if (resultMetricLabel !== undefined) {
        count(metricName, metricDescription, ...[label, resultMetricLabel])
        return
      }

      count(metricName, metricDescription, label)
      return
    }

    if (resultMetricLabel !== undefined) {
      count(metricName, metricDescription, resultMetricLabel)
      return
    }

    count(metricName, metricDescription)
  })

  return true
}
