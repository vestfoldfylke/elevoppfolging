import { logger } from "@vestfoldfylke/loglady"
import type { PrincipalAccess } from "$lib/types/app-types"
import type { Access } from "$lib/types/db/shared-types"
import { getProgramAreaFromCache } from "../cache/program-area-cache"
import { getDbClient } from "../db/get-db-client"

export const expandAccessWithProgramAreaNames = async (principalAccess: Access): Promise<PrincipalAccess> => {
  const principalAccessWithProgramAreaNames: PrincipalAccess = {
    ...principalAccess,
    programAreas: principalAccess.programAreas.map((programAreaAccess) => ({
      ...programAreaAccess,
      name: "Unknown",
      classSystemIds: []
    }))
  }

  for (const programAreaAccess of principalAccessWithProgramAreaNames.programAreas) {
    const programArea = await getProgramAreaFromCache(programAreaAccess._id)
    if (programArea) {
      if (programAreaAccess.schoolNumber !== programArea.schoolNumber) {
        logger.warn(
          `Mismatch in school number for program area access. Expected ${programArea.schoolNumber}, got ${programAreaAccess.schoolNumber}. Skipping adding name and class system IDs for program area with ID ${programAreaAccess._id}`
        )
        continue
      }
      programAreaAccess.name = programArea.name
      programAreaAccess.classSystemIds = programArea.classes.map((classGroup) => classGroup.systemId)
    }
  }

  return principalAccessWithProgramAreaNames
}

export const getPrincipalAccess = async (entraUserId: string): Promise<PrincipalAccess | null> => {
  const dbClient = await getDbClient()
  const principalAccess = await dbClient.getPrincipalAccess(entraUserId)

  if (!principalAccess) {
    return null
  }

  return await expandAccessWithProgramAreaNames(principalAccess)
}
