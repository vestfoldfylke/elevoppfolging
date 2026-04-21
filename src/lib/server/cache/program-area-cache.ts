import { logger } from "@vestfoldfylke/loglady"
import type { ProgramArea } from "$lib/types/db/shared-types"
import { getDbClient } from "../db/get-db-client"

type ProgramAreaCache = Record<string, ProgramArea>

const programAreaCache: ProgramAreaCache = {}

export const getProgramAreaFromCache = async (programAreaId: string): Promise<ProgramArea> => {
  const cacheEntry = programAreaCache[programAreaId]
  if (cacheEntry) {
    logger.info(`Cache hit for programarea access with ID ${programAreaId}`)
    return cacheEntry
  }

  const dbClient = await getDbClient()

  const programArea = await dbClient.getProgramArea(programAreaId)
  if (!programArea) {
    throw new Error(`Program area with ID ${programAreaId} not found in cache`)
  }

  programAreaCache[programAreaId] = programArea
  return programArea
}

export const invalidateProgramAreaCache = (programAreaId: string) => {
  delete programAreaCache[programAreaId]
}
