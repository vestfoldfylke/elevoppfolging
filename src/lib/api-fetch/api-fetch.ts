import type { ApiRouteMap } from "$lib/types/api/api-route-map"

type ApiFetchOptions<Route extends keyof ApiRouteMap, Method extends keyof ApiRouteMap[Route]> = Omit<RequestInit, "method" | "body"> & {
  method: Method
  // Only require body if 'req' is defined in the schema
  body: ApiRouteMap[Route][Method] extends { req: infer R } ? R : never
}

/**
 * Simple wrapper around fetch that type checks route, method, and body - it also stringifies the body if present. Throws errors if the network request fails, if the response is not ok, or if parsing the JSON response fails.
 */
export const apiFetch = async <
  // First define generic parameters for the route and method, constrained to the keys of ApiRouteMap
  Route extends keyof ApiRouteMap,
  Method extends keyof ApiRouteMap[Route]
>(
  route: Route,
  // Then define options parameter that conditionally requires a body based on whether the schema for that route and method includes a 'req' property
  options: ApiRouteMap[Route][Method] extends { req: unknown } ? ApiFetchOptions<Route, Method> : ApiFetchOptions<Route, Method> | (Omit<ApiFetchOptions<Route, Method>, "body"> & { body?: never })
  // Then return a promise that resolves to the type defined in the 'res' property of the schema for that route and method, or void if there is no 'res' property
): Promise<ApiRouteMap[Route][Method] extends { res: infer R } ? R : void> => {
  let response: Response

  const RequestOptions: RequestInit = {
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  } as RequestInit

  try {
    response = await fetch(route, RequestOptions)
  } catch (error) {
    throw new Error(`Network error while fetching ${route}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!response.ok) {
    let errorData: unknown
    try {
      errorData = await response.json()
    } catch (error) {
      throw new Error(`API request failed with status ${response.status} and could not parse error response: ${error instanceof Error ? error.message : String(error)}`)
    }
    throw new Error(`API request failed: ${typeof errorData === "object" && errorData !== null && "message" in errorData ? errorData.message : response.statusText}`)
  }

  try {
    return await response.json()
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${route}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
