import type { ValidationResult } from "$lib/types/data-validation"
import type { StudentDataSharingConsentInput } from "$lib/types/db/shared-types"

export const validateStudentDataSharingConsentData = (consentData: StudentDataSharingConsentInput): ValidationResult => {
  if (typeof consentData.consent !== "boolean" || typeof consentData.message !== "string" || consentData.message.length === 0) {
    return { valid: false, message: "Both 'consent' and 'message' are required" }
  }

  return { valid: true, message: "" }
}
