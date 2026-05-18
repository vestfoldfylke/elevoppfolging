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
    body: generateEmailAlertHtmlBody(documentId, student._id, student.name, type),
    subject: generateEmailAlertHtmlSubject(student.name, type)
  }
}

const generateEmailAlertHtmlBody = (documentId: string, studentId: string, studentName: string, type: NewDbEmailAlert["type"]): string => {
  const url: string = `<a href="${env.WEB_APP_URL}/students/${studentId}?documentId=${documentId}">Elevoppfølging</a>`

  if (type === "DOCUMENT_CREATED") {
    return `Nytt notat opprettet på elev ${studentName}. Gå hit for å se det nye notat: ${url}`
  }

  if (type === "DOCUMENT_MESSAGE_CREATED") {
    return `Oppdatering opprettet på notat for elev ${studentName}. Gå hit for å se oppdateringen: ${url}`
  }

  return `Ukjent notattype opprettet på elev. Gå hit for å sjekke det ut: ${url}`
}

const generateEmailAlertHtmlSubject = (studentName: string, type: NewDbEmailAlert["type"]): string => {
  if (type === "DOCUMENT_CREATED") {
    return `Notat opprettet på elev ${studentName}`
  }

  if (type === "DOCUMENT_MESSAGE_CREATED") {
    return `Oppdatering opprettet på notat for elev ${studentName}`
  }

  return "Ukjent notattype opprettet"
}
