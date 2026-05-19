import { env } from "$env/dynamic/private"
import type { CachedFrontendStudent } from "$lib/types/app-types"
import type { EmailAlertReceiver, NewDbEmailAlert } from "$lib/types/db/shared-types"

export const generateEmailAlertReceivers = (receivers: string[]): EmailAlertReceiver[] => {
  return receivers.map((receiver: string) => {
    return {
      receiver,
      status: "QUEUED"
    }
  })
}

export const generateEmailAlertBody = (documentId: string, student: CachedFrontendStudent, type: NewDbEmailAlert["type"]): NewDbEmailAlert["alertBody"] => {
  return {
    body: generateEmailAlertHtmlBody(documentId, student._id, type),
    subject: generateEmailAlertHtmlSubject(type)
  }
}

const generateEmailAlertHtmlBody = (documentId: string, studentId: string, type: NewDbEmailAlert["type"]): string => {
  const url: string = `<a href="${env.WEB_APP_URL}/students/${studentId}?documentId=${documentId}">Elevoppfølging</a>`

  if (type === "DOCUMENT_CREATED") {
    return `Det er opprettet et notat: ${url}`
  }

  if (type === "DOCUMENT_MESSAGE_CREATED") {
    return `Oppdatering på eksisterende notat: ${url}`
  }

  return `Ukjent notattype opprettet: ${url}`
}

const generateEmailAlertHtmlSubject = (type: NewDbEmailAlert["type"]): string => {
  if (type === "DOCUMENT_CREATED") {
    return "Nytt notat"
  }

  if (type === "DOCUMENT_MESSAGE_CREATED") {
    return "Oppdatering på notat"
  }

  return "Ukjent notattype opprettet"
}
