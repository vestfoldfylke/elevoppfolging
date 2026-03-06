import type { AccessEntry } from "$lib/types/app-types"
import type { ValidationResult } from "$lib/types/data-validation"

export const validateAccessEntry = (accessEntry: AccessEntry): ValidationResult => {
  if (!accessEntry.schoolNumber || !accessEntry.type) {
    return { valid: false, message: "Both 'schoolNumber' and 'type' are required" }
  }

  switch (accessEntry.type) {
    case "MANUELL-SKOLELEDER-TILGANG":
      // No additional fields to validate for this type
      break
    case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
      if (!accessEntry._id || typeof accessEntry._id !== "string") {
        return { valid: false, message: "'_id' is required for MANUELL-UNDERVISNINGSOMRÅDE-TILGANG" }
      }
      break
    case "MANUELL-ELEV-TILGANG":
      if (!accessEntry._id || typeof accessEntry._id !== "string") {
        return { valid: false, message: "'_id' is required for MANUELL-ELEV-TILGANG" }
      }
      break
    case "AUTOMATISK-KLASSE-TILGANG":
    case "MANUELL-KLASSE-TILGANG":
      if (!accessEntry.systemId || typeof accessEntry.systemId !== "string") {
        return { valid: false, message: "'systemId' is required for KLASSE-TILGANG" }
      }
      break
    case "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG":
    case "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG":
      if (!accessEntry.systemId || typeof accessEntry.systemId !== "string") {
        return { valid: false, message: "'systemId' is required for KONTAKTLÆRERGRUPPE-TILGANG and UNDERVISNINGSGRUPPE-TILGANG" }
      }
      break
    default:
      return { valid: false, message: "Invalid 'type' value" }
  }

  return { valid: true, message: "" }
}
