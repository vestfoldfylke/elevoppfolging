import { randomUUID } from "node:crypto"

export const generateUUID = (prefix: string): string => {
  return `${prefix}-${randomUUID()}`
}
