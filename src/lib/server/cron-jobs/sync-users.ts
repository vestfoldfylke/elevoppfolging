/*
Må hente alle brukere som har tilgang via enterprise appen
- Hente alle brukere fra EntraID som har tilgang til appen
- Sjekke om brukeren finnes i vår database
- Hvis ikke, opprette brukeren med info fra EntraID
- Hvis ja, oppdatere infoen hvis den har endret seg (f.eks. navn, epost, grupper, roller)

Kjøres f.eks. hver natt som en cron-jobb
*/

import type {User} from "@microsoft/microsoft-graph-types";
import {logger} from "@vestfoldfylke/loglady";
import {getEntraClient} from "$lib/server/entra/get-entra-client";
import type {IEntraClient} from "$lib/types/entra/entra-client";
import type {AppUser, IDbClient} from "$lib/types/db/db-client";
import {env} from "$env/dynamic/private";
import {getDbClient} from "$lib/server/db/get-db-client";

export const syncUsers = async (): Promise<AppUser[]> => {
  const entraClient: IEntraClient = getEntraClient()
  const enterpriseApplicationUsers: User[] = await entraClient.getEnterpriseApplicationUsers()
  const appUsers: AppUser[] = []

  for (const user of enterpriseApplicationUsers) {
    if (!user.id || !user.companyName || !user.displayName || !user.userPrincipalName || !user.onPremisesSamAccountName) {
      logger.error("User from EntraID is missing crucial info, skipping user: {@User}", user)
      continue
    }

    logger.info("Døtter inn denne kødden: {DisplayName}", user.displayName)
    appUsers.push({
      _id: "",
      feidenavn: `${user.onPremisesSamAccountName}@${env.FEIDENAVN_SUFFIX}`,
      entra: {
        companyName: user.companyName || "BJØRN-HAR-DRETI-PÅ-LEGGEN",
        department: user.department || "BJØRN-HAR-DRETI-PÅ-LEGGEN",
        displayName: user.displayName || "BJØRN-HAR-DRETI-PÅ-LEGGEN",
        userPrincipalName: user.userPrincipalName || "BJØRN-HAR-DRETI-PÅ-LEGGEN",
        id: user.id
      }
    })
  }

  const dbClient: IDbClient = getDbClient()
  await dbClient.replaceUsers(appUsers)

  return appUsers
}
