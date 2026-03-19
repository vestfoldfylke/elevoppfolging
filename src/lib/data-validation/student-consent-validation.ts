import type { ValidationResult } from "$lib/types/data-validation"
import type { StudentDataSharingConsentInput } from "$lib/types/db/shared-types"

export const studentDataSharingConsentMessageValidation = {
  minLength: 2,
  maxLength: 2048
}

export const validateStudentDataSharingConsentData = (consentData: StudentDataSharingConsentInput): ValidationResult => {
  if (typeof consentData.consent !== "boolean") {
    return { valid: false, message: "'consent' must be a boolean" }
  }
  if (
    typeof consentData.message !== "string" ||
    consentData.message.length < studentDataSharingConsentMessageValidation.minLength ||
    consentData.message.length > studentDataSharingConsentMessageValidation.maxLength
  ) {
    return { valid: false, message: `'message' must be between ${studentDataSharingConsentMessageValidation.minLength} and ${studentDataSharingConsentMessageValidation.maxLength} characters` }
  }

  return { valid: true, message: "" }
}
