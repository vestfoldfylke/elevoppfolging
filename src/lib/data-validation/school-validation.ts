import type { ValidationResult } from "$lib/types/data-validation"
import type { NewSchool } from "$lib/types/db/shared-types"

export const schoolNameValidation = {
  pattern: /^[A-Za-zÆØÅæøå\-\s]$/,
  minLength: 4,
  maxLength: 256
}

export const schoolNumberValidation = {
  pattern: /^[0-9]$/,
  minLength: 4,
  maxLength: 20
}

export const validateSchoolData = (schoolData: NewSchool): ValidationResult => {
  if (!schoolData.name || !schoolData.schoolNumber) {
    return { valid: false, message: "Both 'name' and 'schoolNumber' are required" }
  }

  if (typeof schoolData.name !== "string" || typeof schoolData.schoolNumber !== "string") {
    return { valid: false, message: "'name' and 'schoolNumber' must be strings" }
  }

  if (!schoolNameValidation.pattern.test(schoolData.name) || schoolData.name.length < schoolNameValidation.minLength || schoolData.name.length > schoolNameValidation.maxLength) {
    return { valid: false, message: `'name' must be between ${schoolNameValidation.minLength} and ${schoolNameValidation.maxLength} characters and contain only letters and spaces` }
  }

  if (
    !schoolNumberValidation.pattern.test(schoolData.schoolNumber) ||
    schoolData.schoolNumber.length < schoolNumberValidation.minLength ||
    schoolData.schoolNumber.length > schoolNumberValidation.maxLength
  ) {
    return { valid: false, message: `'schoolNumber' must be between ${schoolNumberValidation.minLength} and ${schoolNumberValidation.maxLength} characters and contain only digits` }
  }

  return { valid: true, message: "" }
}
