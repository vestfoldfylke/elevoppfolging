import type { ApplicationInfo, PeriodDetails } from "$lib/types/app-types"
import type { Period } from "$lib/types/db/shared-types"

const isActive = (period: Period): boolean => {
  if (!period.start) {
    return false
  }

  const now: Date = new Date()
  if (!period.end) {
    return now > period.start
  }

  return now > period.start && now < period.end
}

const getDaysUntilActive = (period: Period): number | null => {
  if (!period.start) {
    return null
  }

  const now: Date = new Date()
  const timeDiff = period.start.getTime() - now.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

const getDaysAfterExpired = (period: Period): number | null => {
  if (!period.end) {
    return null
  }

  const now: Date = new Date()
  const timeDiff = now.getTime() - period.end.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

const isWithinPeriodAccessWindow = (daysUntilActive: number | null, daysAfterExpired: number | null, APP_INFO: ApplicationInfo): boolean => {
  const withinActiveWindow = daysUntilActive !== null && daysUntilActive > 0 && daysUntilActive <= APP_INFO.STUDENT_ACCESS_BEFORE_ACTIVE_DAYS
  const withinExpireWindow = daysAfterExpired !== null && daysAfterExpired > 0 && daysAfterExpired <= APP_INFO.STUDENT_ACCESS_AFTER_EXPIRE_DAYS
  return withinActiveWindow || withinExpireWindow
}

export const getPeriodDetails = (period: Period, APP_INFO: ApplicationInfo): PeriodDetails => {
  const daysUntilActive = getDaysUntilActive(period)
  const daysAfterExpired = getDaysAfterExpired(period)
  const withinViewAccessWindow = isWithinPeriodAccessWindow(daysUntilActive, daysAfterExpired, APP_INFO)

  return {
    ...period,
    active: isActive(period),
    daysUntilActive,
    daysAfterExpired,
    withinViewAccessWindow
  }
}
