import { json, type RequestEvent, error as svelteError } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { ApiNextFunction, ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getAuthenticatedPrincipal } from "../authentication/get-authenticated-principal"
import { HTTPError } from "./http-error"

/**
 * Wrap functionality in a server route with this middleware to handle authentication, some simple logging and error handling.
 * The `next` function will only be called if authentication is successful.
 * Make sure to handle authorization (access to resources) inside the `next` function throw a HTTPError if not authorized.
 *
 * @param {RequestEvent} requestEvent The incoming request event from SvelteKit server route
 * @param {ApiNextFunction} next The middleware next function to call if authentication is successful, passing in the request event, authenticated user and body if the request has a JSON body
 * @returns {Promise<Response>} The final response to return to the client
 */
export const apiRequestMiddleware = async <TResponse extends object, TRequestBody = undefined>(requestEvent: RequestEvent, next: ApiNextFunction<TResponse, TRequestBody>): Promise<Response> => {
  const request = requestEvent.request
  let loggerPrefix = `[API Request Middleware] - ${request.method} ${request.url}`

  logger.info(`${loggerPrefix} - Incoming request`)

  let principal: AuthenticatedPrincipal
  try {
    principal = getAuthenticatedPrincipal(request.headers)
    loggerPrefix += ` - Principal: ${principal.id} (${principal.displayName})`
    logger.info(`${loggerPrefix} - Authenticated`)
  } catch (error) {
    logger.errorException(error, `${loggerPrefix} - Error during authentication`)
    return json({ message: "Unauthorized" }, { status: 401 })
  }

  let body: TRequestBody | undefined
  if (request.headers.get("Content-Type")?.includes("application/json")) {
    try {
      body = (await request.json()) as TRequestBody
    } catch (error) {
      logger.errorException(error, `${loggerPrefix} - Error parsing JSON body`)
      return json({ message: "Invalid JSON body" }, { status: 400 })
    }
  }

  try {
    const data = await next({ requestEvent, principal, body: body as TRequestBody })

    logger.info(`${loggerPrefix} - Request processed successfully for principal {principalId}`, principal.id)

    try {
      JSON.stringify(data)
    } catch (error) {
      logger.errorException(error, `${loggerPrefix} - Error serializing response data - please provide data that can be serialized to JSON`)
      return json({ message: "Internal Server Error" }, { status: 500 })
    }
    return json(data)
  } catch (error) {
    if (error instanceof HTTPError) {
      logger.errorException(error, `${loggerPrefix} - HTTP Error {status}`, error.status)
      return json({ message: error.message, data: error.data || null }, { status: error.status })
    }
    logger.errorException(error, `${loggerPrefix} - Internal Server Error`)
    return json({ message: "Internal Server Error" }, { status: 500 })
  }
}

/**
 * Wrap functionality in a server route with this middleware to handle authentication, some simple logging and error handling.
 * The `next` function will only be called if authentication is successful.
 * Make sure to handle authorization (access to resources) inside the `next` function and either throw a HTTPError or return `isAuthorized: false` if the caller is not authorized to access the requested resource.
 *
 * @param {RequestEvent} requestEvent The incoming request event from SvelteKit server route
 * @param {ServerLoadNextFunction} next The middleware next function to call if authentication is successful, passing in the request event and authenticated user
 * @returns {Promise<Response>} The final response to return to the client
 */
export const serverLoadRequestMiddleware = async <T>(requestEvent: RequestEvent, next: ServerLoadNextFunction<T>): Promise<T> => {
  const request = requestEvent.request
  let loggerPrefix = `[Server load Request Middleware] - ${request.method} ${request.url}`

  logger.info(`${loggerPrefix} - Incoming request`)

  let principal: AuthenticatedPrincipal
  try {
    principal = getAuthenticatedPrincipal(request.headers)
    loggerPrefix += ` - Principal: ${principal.id} (${principal.displayName})`
    logger.info(`${loggerPrefix} - Authenticated`)
  } catch (error) {
    logger.errorException(error, `${loggerPrefix} - Error during authentication`)
    svelteError(401, "Unauthorized")
  }
  let data: T
  let isAuthorized: boolean
  try {
    const nextResult = await next({ requestEvent, principal })
    data = nextResult.data
    isAuthorized = nextResult.isAuthorized
  } catch (error) {
    if (error instanceof HTTPError) {
      logger.errorException(error, `${loggerPrefix} - HTTP Error {status}`, error.status)
      svelteError(error.status, error.message)
    }
    logger.errorException(error, `${loggerPrefix} - Internal Server Error`)
    svelteError(500, "Internal Server Error")
  }
  if (!isAuthorized) {
    logger.warn(`${loggerPrefix} - Principal {principalId} is not authorized to access this resource`, principal.id)
    svelteError(403, "Forbidden")
  }
  logger.info(`${loggerPrefix} - Request processed successfully for principal {principalId}`, principal.id)
  return data
}
