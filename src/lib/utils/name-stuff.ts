export const getInitialsFromName = (name: string): string => {
  const nameParts = name.trim().split(/\s+/)
  if (nameParts.length === 0) {
    return ""
  }
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase()
  }
  const firstInitial = nameParts[0].charAt(0).toUpperCase()
  const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase()
  return firstInitial + lastInitial
}