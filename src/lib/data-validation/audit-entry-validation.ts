import type { ValidationResult } from "$lib/types/data-validation"
import type { AuditEntryInput } from "$lib/types/db/shared-types"

export const validateAuditEntryInput = (auditEntry: AuditEntryInput): ValidationResult => {
  if (!auditEntry.created) {
    return { valid: false, message: "'created' is required on audit entry" }
  }

  if (!auditEntry.action) {
    return { valid: false, message: "'action' is required on audit entry" }
  }

  if (!auditEntry.resource) {
    return { valid: false, message: "'resource' is required on audit entry" }
  }

  if (!auditEntry.resourceId) {
    return { valid: false, message: "'resourceId' is required on audit entry" }
  }

  if (auditEntry.metaData) {
    if (!auditEntry.metaData.parentResource) {
      return { valid: false, message: "'parentResource' in 'metaData' is required when 'metaData' is present on audit entry" }
    }

    if (auditEntry.metaData.data && typeof auditEntry.metaData.data !== "string") {
      return { valid: false, message: "'data' in 'metaData' must be a string when 'metaData.data' is present on audit entry" }
    }
  }

  return { valid: true, message: "" }
}
