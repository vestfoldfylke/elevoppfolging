import type { ValidationResult } from "$lib/types/data-validation"
import type { DocumentMessageInput } from "$lib/types/db/shared-types"

export const validateDocumentMessage = (messageData: DocumentMessageInput): ValidationResult => {
  if (!messageData.type || (messageData.type !== "comment" && messageData.type !== "update")) {
    return { valid: false, message: "Message type is required and must be either 'comment' or 'update'." }
  }
  if (messageData.type === "comment") {
    return { valid: false, message: "Comment is not supported, use 'update' instead." }
  }
  if (!messageData.content.title || typeof messageData.content.title !== "string") {
    return { valid: false, message: "Message title is required and must be a string." }
  }
  if (!messageData.content.text || typeof messageData.content.text !== "string") {
    return { valid: false, message: "Message text is required and must be a string." }
  }

  return { valid: true, message: "" }
}
