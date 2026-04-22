import type { ValidationResult } from "$lib/types/data-validation"
import type { DocumentContentTemplate } from "$lib/types/db/shared-types"

export const validateDocumentContentTemplate = (templateData: DocumentContentTemplate): ValidationResult => {
  if (!templateData.name || typeof templateData.name !== "string") {
    return { valid: false, message: "Template name is required and must be a string." }
  }
  if (!templateData.availableForDocumentType) {
    return { valid: false, message: "Template must have property availableForDocumentType." }
  }
  if (typeof templateData.availableForDocumentType.group !== "boolean" && typeof templateData.availableForDocumentType.student !== "boolean") {
    return { valid: false, message: "Template availableForDocumentType must have boolean properties for group or student." }
  }
  if (typeof templateData.sort !== "number") {
    return { valid: false, message: "Template sort is required and must be a number." }
  }
  if (!Array.isArray(templateData.content)) {
    return { valid: false, message: "Document content is required and must be an array." }
  }

  // Template content item validation
  for (const contentItem of templateData.content) {
    switch (contentItem.type) {
      case "textarea":
      case "inputText": {
        if (!contentItem.label || typeof contentItem.label !== "string") {
          return { valid: false, message: `Content item of type ${contentItem.type} must have a valid label.` }
        }
        if (typeof contentItem.required !== "boolean") {
          return { valid: false, message: `Content item of type ${contentItem.type} must have a boolean required property.` }
        }
        break
      }
      case "checkboxGroup":
      case "radioGroup": {
        if (!contentItem.header || typeof contentItem.header !== "string") {
          return { valid: false, message: `Content item of type ${contentItem.type} must have a valid header.` }
        }
        if (!Array.isArray(contentItem.items) || contentItem.items.length === 0) {
          return { valid: false, message: `Content item of type ${contentItem.type} must have an array of items with at least one item.` }
        }
        for (const item of contentItem.items) {
          if (!item.value || typeof item.value !== "string" || !item.label || typeof item.label !== "string") {
            return { valid: false, message: `Each item in a ${contentItem.type} content item must have a valid value and label.` }
          }
        }
        break
      }
      case "header":
      case "paragraph":
      case "info": {
        if (!contentItem.value || typeof contentItem.value !== "string") {
          return { valid: false, message: `Content item of type ${contentItem.type} must have a valid value.` }
        }
        if (contentItem.type === "info") {
          if (!contentItem.link || typeof contentItem.link.url !== "string" || typeof contentItem.link.text !== "string") {
            return { valid: false, message: `Content item of type info must have a link.url and link.text of type string.` }
          }
          if ((contentItem.link.url && !contentItem.link.text) || (!contentItem.link.url && contentItem.link.text)) {
            return { valid: false, message: `Content item of type info must have both link.url and link.text or neither.` }
          }
          if (contentItem.link.url && !URL.canParse(contentItem.link.url)) {
            return { valid: false, message: `Content item of type info has an invalid URL in link.url` }
          }
        }
        break
      }
      default: {
        return { valid: false, message: `Content item has invalid type` }
      }
    }
  }

  return { valid: true, message: "" }
}
