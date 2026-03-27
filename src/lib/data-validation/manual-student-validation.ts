import type { ValidationResult } from "$lib/types/data-validation"
import type { NewManualStudentInput } from "$lib/types/db/shared-types"

export const ssnValidation = {
  pattern: /^[0-9].+$/,
  minLength: 11,
  maxLength: 11
}

export const nameValidation = {
  pattern: /^[a-zA-ZæøåÆØÅ\-. ].+$/,
  minLength: 2,
  maxLength: 50
}

export const validateManualStudentData = (manualStudentInput: NewManualStudentInput): ValidationResult => {
  if (!manualStudentInput.name || !manualStudentInput.ssn || !manualStudentInput.school) {
    return { valid: false, message: "'name', 'ssn' and 'school' are required" }
  }

  if (!ssnValidation.pattern.test(manualStudentInput.ssn) || manualStudentInput.ssn.length < ssnValidation.minLength || manualStudentInput.ssn.length > ssnValidation.maxLength) {
    return { valid: false, message: `'ssn' must be between ${ssnValidation.minLength} and ${ssnValidation.maxLength} characters and contain only digits` }
  }

  if (!nameValidation.pattern.test(manualStudentInput.name) || manualStudentInput.name.length < nameValidation.minLength || manualStudentInput.name.length > nameValidation.maxLength) {
    return { valid: false, message: `'name' must be between ${nameValidation.minLength} and ${nameValidation.maxLength} characters and contain letters and spaces` }
  }

  return { valid: true, message: "" }
}
