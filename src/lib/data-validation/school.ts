import type { ValidationResult } from "$lib/types/data-validation"
import type { NewSchool } from "$lib/types/db/shared-types"

export const validateSchoolData = (schoolData: NewSchool): ValidationResult => {
  if (!schoolData.name || !schoolData.schoolNumber) {
    return { valid: false, message: "Both 'name' and 'schoolNumber' are required" }
  }

  if (typeof schoolData.name !== "string" || typeof schoolData.schoolNumber !== "string") {
    return { valid: false, message: "'name' and 'schoolNumber' must be strings" }
  }

  if (schoolData.name.length < 4 || schoolData.name.length > 256 || !/^[A-Za-zÆØÅæøå-\s]+$/.test(schoolData.name)) {
    return { valid: false, message: "'name' must be between 4 and 256 characters and contain only letters and spaces" }
  }

  if (schoolData.schoolNumber.length < 4 || schoolData.schoolNumber.length > 20 || !/^[0-9]+$/.test(schoolData.schoolNumber)) {
    return { valid: false, message: "'schoolNumber' must be between 4 and 20 characters and contain only digits" }
  }

  return { valid: true, message: "" }
}
