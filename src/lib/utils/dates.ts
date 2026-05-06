import { DateTime } from "luxon"

export const getDateDaysBack = (daysBack: number, date?: Date): Date => {
  const d: number = date ? date.getTime() : Date.now()

  return new Date(d - daysBack * 24 * 60 * 60 * 1000)
}

export const getDateDaysAhead = (daysAhead: number, date?: Date): Date => {
  const d: number = date ? date.getTime() : Date.now()

  return new Date(d + daysAhead * 24 * 60 * 60 * 1000)
}

export const getDateValue = (date: Date): string => date.toISOString().slice(0, 10)

export const getEndOfDate = (date: Date): Date => DateTime.fromJSDate(date).endOf("day").toJSDate()

export const getStartOfDate = (date: Date): Date => DateTime.fromJSDate(date).startOf("day").toJSDate()

export const prettifyDate = (date: Date): string => {
  return date.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  })
}

export const prettifyDateTime = (date: Date | string): string => {
  const d: Date = typeof date === "string" ? new Date(date) : date

  return d.toLocaleString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}
