import { logger } from "@vestfoldfylke/loglady"
import type { CachedAppUser } from "$lib/types/app-types"
import { APP_INFO } from "../app-info"
import { getDbClient } from "../db/get-db-client"

type AppUserCache = {
  updateInProgress: boolean
  updated: Date | null
  users: CachedAppUser[]
}

const appUserCache: AppUserCache = {
  updateInProgress: false,
  updated: null,
  users: []
}

export const updateAppUserCache = async () => {
  if (appUserCache.updateInProgress) {
    logger.info("Update of app users cache already in progress, skipping")
    return
  }

  logger.info("Updating app users cache")
  appUserCache.updateInProgress = true
  const dbClient = getDbClient()

  logger.info("Fetching all app users from database to update cache")
  const startTime = Date.now() // TODO remove datestuff when we know its ok
  const users = await dbClient.getAllAppUsers()
  const endTime = Date.now()
  logger.info(`Fetched ${users.length} app users from database in ${(endTime - startTime) / 1000}s, updating cache`)

  appUserCache.users = users

  appUserCache.updated = new Date()
  appUserCache.updateInProgress = false
  console.log("memory used", process.memoryUsage().heapUsed / 1024 / 1024, "MB")
}

/**
 *
 * returns student available based on the access parameter
 * If cache is empty, it will populate the cache before returning users, and users will have to wait for the cache to be populated.
 * If cache is too old, it will update the cache in the background but return the old cache for now, to avoid making users wait for the cache to update.
 */
export const getAppUsersFromCache = async (): Promise<CachedAppUser[]> => {
  // If first time or cache is empty, populate cache before returning users
  if (!appUserCache.updated || appUserCache.users.length === 0) {
    logger.info("App users cache is empty, populating cache before returning users, user will have to wait...")
    await updateAppUserCache()
    return appUserCache.users
  }

  // IF cache is too old, update it in the background but return the old cache for now
  const now = new Date()
  const cacheAgeMinutes = (now.getTime() - appUserCache.updated.getTime()) / 1000 / 60
  if (cacheAgeMinutes > APP_INFO.APP_USER_CACHE_MAX_AGE_MINUTES) {
    logger.info(`App users cache is ${cacheAgeMinutes} minutes old, requesting update in background`)
    updateAppUserCache().catch((error) => {
      logger.errorException(error, "Error updating app users cache, application is probably unusable until this is fixed")
    })
  }

  return appUserCache.users
}

export const getAppUserFromCache = async (entraUserId: string): Promise<CachedAppUser | undefined> => {
  const users = await getAppUsersFromCache()
  return users.find((user) => user.entra.id === entraUserId)
}
