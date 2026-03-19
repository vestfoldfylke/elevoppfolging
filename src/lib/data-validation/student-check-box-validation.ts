import type { ValidationResult } from "$lib/types/data-validation"
import type { StudentCheckBoxInput } from "$lib/types/db/shared-types"

export const studentCheckBoxValueValidation = {
  minLength: 2,
  maxLength: 256,
}

export const validateStudentCheckBox = (checkBoxData: StudentCheckBoxInput): ValidationResult => {
  if (!checkBoxData.type || !checkBoxData.value) {
    return { valid: false, message: "Both 'type' and 'value' are required" }
  }

  if (typeof checkBoxData.type !== "string" || typeof checkBoxData.value !== "string") {
    return { valid: false, message: "'type' and 'value' must be strings" }
  }

  if (!["FACILITATION", "FOLLOW_UP"].includes(checkBoxData.type)) {
    return { valid: false, message: "'type' must be either 'FACILITATION' or 'FOLLOW_UP'" }
  }

  if (checkBoxData.value.length < studentCheckBoxValueValidation.minLength || checkBoxData.value.length > studentCheckBoxValueValidation.maxLength) {
    return { valid: false, message: `'value' must be between ${studentCheckBoxValueValidation.minLength} and ${studentCheckBoxValueValidation.maxLength} characters` }
  }

  if (typeof checkBoxData.enabled !== "boolean") {
    return { valid: false, message: "'enabled' must be a boolean" }
  }

  if (typeof checkBoxData.sort !== "number" || !Number.isInteger(checkBoxData.sort) || checkBoxData.sort < 0) {
    return { valid: false, message: "'sort' must be a non-negative integer" }
  }

  return { valid: true, message: "" }
}
