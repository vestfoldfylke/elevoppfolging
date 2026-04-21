import type { ValidationResult } from "$lib/types/data-validation"
import type { DocumentInput } from "$lib/types/db/shared-types"

export const validateDocument = (documentData: DocumentInput): ValidationResult => {
  if (!documentData.school || typeof documentData.school !== "object") {
    return { valid: false, message: "School information is required and must be an object." }
  }
  if (!documentData.school.schoolNumber || typeof documentData.school.schoolNumber !== "string") {
    return { valid: false, message: "School number is required and must be a string." }
  }
  if (!documentData.title || typeof documentData.title !== "string") {
    return { valid: false, message: "Document title is required and must be a string." }
  }
  if (!documentData.template || typeof documentData.template !== "object") {
    return { valid: false, message: "Template information is required and must be an object." }
  }
  if (!documentData.template._id || typeof documentData.template._id !== "string") {
    return { valid: false, message: "Template ID is required and must be a string." }
  }
  if (!documentData.template.name || typeof documentData.template.name !== "string") {
    return { valid: false, message: "Template name is required and must be a string." }
  }
  if (typeof documentData.template.version !== "number") {
    return { valid: false, message: "Template version is required and must be a number." }
  }
  if (!Array.isArray(documentData.content)) {
    return { valid: false, message: "Document content is required and must be an array." }
  }

  // Content item validation
  for (const contentItem of documentData.content) {
    switch (contentItem.type) {
      case "textarea":
      case "inputText": {
        if (typeof contentItem.value !== "string") {
          return { valid: false, message: `Content item of type ${contentItem.type} has an invalid value: must be a string.` }
        }
        if (contentItem.required && !contentItem.value) {
          return { valid: false, message: `Content item of type ${contentItem.type} is required but has no value.` }
        }
        break
      }
      case "radioGroup": {
        if (contentItem.selectedValue === undefined || contentItem.selectedValue === "") {
          return { valid: false, message: "Content item of type radioGroup is required but has no selected value." }
        }
        break
      }
      case "checkboxGroup": {
        if (!Array.isArray(contentItem.selectedValues) || contentItem.selectedValues.length === 0) {
          return { valid: false, message: "Content item of type checkboxGroup is required but has no selected values." }
        }
        break
      }
    }
  }

  return { valid: true, message: "" }
}
