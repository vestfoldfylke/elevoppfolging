export const prettifyDate = (date: Date): string => {
  return date.toLocaleDateString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  })
}

export const prettifyDateTime = (date: Date): string => {
  return date.toLocaleString("no-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  })
}
