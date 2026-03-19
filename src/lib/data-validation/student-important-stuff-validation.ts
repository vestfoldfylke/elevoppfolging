import type { ValidationResult } from "$lib/types/data-validation"
import type { StudentImportantStuffInput } from "$lib/types/db/shared-types"

export const validateStudentImportantStuffData = (importantStuffData: StudentImportantStuffInput): ValidationResult => {
  if (!importantStuffData.school || typeof importantStuffData.school.schoolNumber !== "string" || typeof importantStuffData.school.name !== "string") {
    return { valid: false, message: "Invalid or missing 'school' information" }
  }

  if (typeof importantStuffData.importantInfo !== "string") {
    return { valid: false, message: "'importantInfo' is required and must be a string" }
  }

  if (!Array.isArray(importantStuffData.followUp) || !importantStuffData.followUp.every((item) => typeof item === "string")) {
    return { valid: false, message: "'followUp' must be an array of strings" }
  }

  if (!Array.isArray(importantStuffData.facilitation) || !importantStuffData.facilitation.every((item) => typeof item === "string")) {
    return { valid: false, message: "'facilitation' must be an array of strings" }
  }

  return { valid: true, message: "" }
}
