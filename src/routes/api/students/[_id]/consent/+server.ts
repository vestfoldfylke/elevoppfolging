import type { RequestHandler } from "@sveltejs/kit"
import { validateStudentDataSharingConsentData } from "$lib/data-validation/student-consent"
import { getStudentAccessInfo } from "$lib/server/authorization/student-access"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canEditStudentDataSharingConsent } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap } from "$lib/types/api/api-route-map"
import type { NewStudentDataSharingConsent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type PatchConsentResponse = ApiRouteMap[`/api/students/${string}/consent`]["PATCH"]["res"]
type PatchConsentBody = ApiRouteMap[`/api/students/${string}/consent`]["PATCH"]["req"]

const updateStudentDataSharingConsent: ApiNextFunction<PatchConsentResponse, PatchConsentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params._id
  if (!studentId || typeof studentId !== "string") {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  // Authorization
  const dbClient = getDbClient()

  const principalAccess = await dbClient.getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, "Access denied: No access found for the principal")
  }

  const currentStudent = await dbClient.getStudentById(studentId)
  if (!currentStudent) {
    throw new HTTPError(404, "Student not found, cannot consent to non-existing student")
  }

  const accessInfo = getStudentAccessInfo(currentStudent, principalAccess)
  if (accessInfo.length === 0) {
    throw new HTTPError(403, "Access denied: No access to the student")
  }

  const canConsentForStudent = canEditStudentDataSharingConsent(accessInfo)
  if (!canConsentForStudent) {
    throw new HTTPError(403, "Access denied: Insufficient access level to edit student data sharing consent")
  }

  const validationResult = validateStudentDataSharingConsentData(body)

  if (!validationResult.valid) {
    throw new HTTPError(400, "Invalid request body", { details: validationResult.message })
  }

  const upsertConsentData: NewStudentDataSharingConsent = {
    consent: body.consent,
    message: body.message,
    modified: {
      by: {
        entraUserId: principal.id,
        fallbackName: principal.displayName
      },
      at: new Date()
    }
  }

  const upsertedConsentId = await dbClient.upsertStudentDataSharingConsent(studentId, upsertConsentData)

  return {
    consentId: upsertedConsentId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<PatchConsentResponse, PatchConsentBody>(requestEvent, updateStudentDataSharingConsent)
}
