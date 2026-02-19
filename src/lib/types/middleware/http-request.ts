import type { RequestEvent } from "@sveltejs/kit"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"

type ApiNextParams<TRequestBody = undefined> = {
  requestEvent: RequestEvent
  principal: AuthenticatedPrincipal
  body: TRequestBody
}

export type ApiNextFunction<TResponse extends object, TRequestBody = undefined> = (params: ApiNextParams<TRequestBody>) => Promise<TResponse>

type ServerLoadNextResponse<T> = {
  data: T
  isAuthorized: boolean
}

type ServerLoadNextParams = {
  requestEvent: RequestEvent
  principal: AuthenticatedPrincipal
}

// TODO drop isAuthorized from this to - just return T like apinextfunction
export type ServerLoadNextFunction<T> = (params: ServerLoadNextParams) => Promise<ServerLoadNextResponse<T>>
