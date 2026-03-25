import type { ServerInit } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { updateStudentsCache } from "$lib/server/cache/students-cache"
import { updateAppUserCache } from "$lib/server/cache/users-cache"

export const init: ServerInit = async () => {
  logger.info("Initializing server and populating students and users caches")
  try {
    await Promise.all([updateStudentsCache(), updateAppUserCache()])
  } catch (error) {
    logger.errorException(error, "Error populating caches during server initialization, application is probably unusable until this is fixed")
  }
  logger.info("Finished initializing server")
}
