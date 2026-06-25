import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { validateStudentDataSharingConsentData } from "$lib/data-validation/student-consent-validation"
import { resolveStudentContext } from "$lib/server/authorization/principal-context"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { authorizeEditStudentDataSharingConsent } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { EditorData, NewStudentDataSharingConsent, StudentDataSharingConsent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"

type PatchConsentResponse = ApiRouteMap[`/api/students/${NoSlashString}/consent`]["PATCH"]["res"]
type PatchConsentBody = ApiRouteMap[`/api/students/${NoSlashString}/consent`]["PATCH"]["req"]

const updateStudentDataSharingConsent: ApiNextFunction<PatchConsentResponse, PatchConsentBody> = async ({ requestEvent, principal, body }) => {
  const studentId = requestEvent.params.student_id
  if (!studentId || typeof studentId !== "string") {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const { student: currentStudent, principalAccessForStudent } = await resolveStudentContext(principal, studentId)

  const authorizationResult = authorizeEditStudentDataSharingConsent(principalAccessForStudent)
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const validationResult = validateStudentDataSharingConsentData(body)

  if (!validationResult.valid) {
    throw new HTTPError(400, `Invalid request body: ${validationResult.message}`)
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  const upsertConsentData: NewStudentDataSharingConsent = {
    consent: body.consent,
    message: body.message,
    modified: editorData
  }

  const dbClient = getDbClient()

  const currentStudentDataSharingConsent: StudentDataSharingConsent | null = await dbClient.studentDataSharingConsents.getStudentDataSharingConsent(studentId)

  let upsertedConsentId: string

  try {
    upsertedConsentId = await dbClient.studentDataSharingConsents.upsertStudentDataSharingConsent(studentId, upsertConsentData)
  } catch (error) {
    if (currentStudentDataSharingConsent) {
      throw new HTTPError(500, "Feilet ved oppdatering av samtykke til deling av notater for elev", error)
    }

    throw new HTTPError(500, "Feilet ved opprettelse av samtykke til deling av notater for elev", error)
  }

  if (currentStudentDataSharingConsent) {
    try {
      await dbClient.auditLogs.createAuditEntry({
        created: editorData,
        action: "UPDATE",
        resource: "StudentDataSharingConsent",
        resourceId: upsertedConsentId,
        resourceName: "",
        metaData: {
          data: JSON.stringify({
            studentName: currentStudent.name
          }),
          parentResource: "Student",
          parentResourceId: studentId
        }
      })
    } catch (error) {
      logger.errorException(error, "Failed to create audit entry when updating StudentDataSharingConsentId {StudentDataSharingConsentId}", upsertedConsentId)
    }

    return {
      consentId: upsertedConsentId
    }
  }

  try {
    await dbClient.auditLogs.createAuditEntry({
      created: editorData,
      action: "CREATE",
      resource: "StudentDataSharingConsent",
      resourceId: upsertedConsentId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          studentName: currentStudent.name
        }),
        parentResource: "Student",
        parentResourceId: studentId
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when creating StudentDataSharingConsentId {StudentDataSharingConsentId}", upsertedConsentId)
  }

  return {
    consentId: upsertedConsentId
  }
}

export const PATCH: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<PatchConsentResponse, PatchConsentBody>(requestEvent, updateStudentDataSharingConsent)
}
