import { type ActionFailure, fail, json, type RequestEvent, error as svelteError } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { ApiNextFunction, ServerActionNextFunction, ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import { getAuthenticatedPrincipal } from "../authentication/get-authenticated-principal"
import { FormActionError } from "./form-action-error"
import { HTTPError } from "./http-error"

/**
 * Wrap functionality in a server route with this middleware to handle authentication, some simple logging and error handling.
 * The `next` function will only be called if authentication is successful.
 * Make sure to handle authorization (access to resources) inside the `next` function and either throw a HTTPError or return `isAuthorized: false` if the caller is not authorized to access the requested resource.
 *
 * @param {RequestEvent} requestEvent The incoming request event from SvelteKit server route
 * @param {ApiNextFunction} next The middleware next function to call if authentication is successful, passing in the request event and authenticated user
 * @returns {Promise<Response>} The final response to return to the client
 */
export const apiRequestMiddleware = async (requestEvent: RequestEvent, next: ApiNextFunction): Promise<Response> => {
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
  try {
    const { response, isAuthorized } = await next({ requestEvent, principal })
    if (!isAuthorized) {
      logger.warn(`${loggerPrefix} - Principal {principalId} is not authorized to access this resource`, principal.id)
      return json({ message: "Forbidden" }, { status: 403 })
    }
    logger.info(`${loggerPrefix} - Request processed successfully for principal {principalId}`, principal.id)
    if (!(response instanceof Response)) {
      logger.error(`${loggerPrefix} - Next function did not return a valid Response object`)
      return json({ message: "Internal Server Error" }, { status: 500 })
    }
    return response
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

/**
 * Wrap functionality in a server action with this middleware to handle authentication, some simple logging and error handling.
 * The `next` function will only be called if authentication is successful.
 * Throw a `FormActionError` from the `next` function if you want to return a validation error to the client with specific status code and message. The `FormActionError` can also include additional values that will be returned to the client and can be used in the form to show specific error messages for form fields.
 * Make sure to handle authorization (access to resources) inside the `next` function and either throw a HTTPError or return `isAuthorized: false` if the caller is not authorized to access the requested resource.
 *
 * @param {RequestEvent} requestEvent The incoming request event from SvelteKit server route
 * @param {ServerActionNextFunction} next The middleware next function to call if authentication is successful, passing in the request event and authenticated user
 * @returns {Promise<Response>} The final response to return to the client
 */
export const serverActionRequestMiddleware = async <TSuccess extends object, TFailure extends object>(
  requestEvent: RequestEvent,
  next: ServerActionNextFunction<TSuccess>
): Promise<TSuccess | ActionFailure<TFailure & { message: string }>> => {
  const request = requestEvent.request
  let loggerPrefix = `[Server action Request Middleware] - ${request.method} ${request.url}`

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
  let data: TSuccess
  let isAuthorized: boolean
  try {
    const nextResult = await next({ requestEvent, principal })
    data = nextResult.data
    isAuthorized = nextResult.isAuthorized
  } catch (error) {
    if (error instanceof FormActionError) {
      logger.errorException(error.originalError || error, `${loggerPrefix} - Form Action Error {status}`, error.status)
      return fail(error.status, { message: error.message, ...(error.values as TFailure) })
    }

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
  // Redirect to the same page, but without the action in the URL
  //redirect(303, requestEvent.url.pathname)
  return data
}
