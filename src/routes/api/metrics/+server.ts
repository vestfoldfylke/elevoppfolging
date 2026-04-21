import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { incrementCount } from "$lib/server/metrics/handle-metrics"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type MetricCountRequest = ApiRouteMap["/api/metrics"]["POST"]["req"]
type MetricCountResponse = ApiRouteMap["/api/metrics"]["POST"]["res"]

const addCountMetrics: ApiNextFunction<MetricCountResponse, MetricCountRequest> = async ({ body }) => {
  try {
    incrementCount(body)

    return {
      incremented: true
    }
  } catch (error) {
    logger.errorException(error, "Failed to add count metrics with MetricCount: {@MetricCount}", body)

    return {
      incremented: false
    }
  }
}

export const POST: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<MetricCountResponse, MetricCountRequest>(requestEvent, addCountMetrics)
}
