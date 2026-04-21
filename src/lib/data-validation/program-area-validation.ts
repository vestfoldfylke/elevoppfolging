import type { ValidationResult } from "$lib/types/data-validation"
import type { ProgramAreaInput } from "$lib/types/db/shared-types"

export const nameValidation = {
  pattern: /^[a-zA-Z0-9æøåÆØÅ\-. ].+$/,
  minLength: 2,
  maxLength: 50
}

export const validateProgramAreaData = (programAreaInput: ProgramAreaInput): ValidationResult => {
  if (!programAreaInput.name) {
    return { valid: false, message: "'name' is required" }
  }
  if (!programAreaInput.schoolNumber) {
    return { valid: false, message: "'schoolNumber' is required" }
  }

  if (!programAreaInput.classes || !Array.isArray(programAreaInput.classes) || programAreaInput.classes.length === 0) {
    return { valid: false, message: "'classes' is required and must be a non-empty array" }
  }

  if (!nameValidation.pattern.test(programAreaInput.name) || programAreaInput.name.length < nameValidation.minLength || programAreaInput.name.length > nameValidation.maxLength) {
    return { valid: false, message: `'name' must be between ${nameValidation.minLength} and ${nameValidation.maxLength} characters and contain letters, numbers, and spaces` }
  }

  for (const classInfo of programAreaInput.classes) {
    if (!classInfo.systemId) {
      return { valid: false, message: "Each class must have a 'systemId'" }
    }
    if (typeof classInfo.systemId !== "string") {
      return { valid: false, message: "Each class 'systemId' must be a string" }
    }
    if (!classInfo.fallbackName) {
      return { valid: false, message: "Each class must have a 'fallbackName'" }
    }
    if (typeof classInfo.fallbackName !== "string") {
      return { valid: false, message: "Each class 'fallbackName' must be a string" }
    }
  }

  return { valid: true, message: "" }
}
