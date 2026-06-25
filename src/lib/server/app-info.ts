import { env } from "$env/dynamic/private"
import type { ApplicationInfo } from "$lib/types/app-types"
import { version } from "../../../package.json"

export const APP_INFO: ApplicationInfo = {
  NAME: env.APP_NAME || "Elevoppfølging",
  VERSION: version,
  ENVIRONMENT: env.NODE_ENV || "development",
  ROLES: {
    EMPLOYEE: env.APP_ROLE_EMPLOYEE || "employee",
    ADMIN: env.APP_ROLE_ADMIN || "admin",
    METRICS: env.APP_ROLE_METRICS || "metrics"
  },
  STUDENT_ACCESS_BEFORE_ACTIVE_DAYS: Number(env.STUDENT_ACCESS_BEFORE_ACTIVE_DAYS) || 0,
  STUDENT_ACCESS_AFTER_EXPIRE_DAYS: Number(env.STUDENT_ACCESS_AFTER_EXPIRE_DAYS) || 0,
  STUDENT_CACHE_MAX_AGE_MINUTES: Number(env.STUDENT_CACHE_MAX_AGE_MINUTES) || 240,
  STUDENT_OVERVIEW_TOP: Number(env.STUDENT_OVERVIEW_TOP) || 100,
  APP_USER_CACHE_MAX_AGE_MINUTES: Number(env.APP_USER_CACHE_MAX_AGE_MINUTES) || 240,
  SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS: Number(env.SCREEN_SAVER_INACTIVITY_TIMEOUT_SECONDS) || 300,
  BANNER_INFO_MESSAGE: env.BANNER_INFO_MESSAGE,
  STUDENT_DATA_SHARING_CONSENT_LINK: env.STUDENT_DATA_SHARING_CONSENT_LINK
}
