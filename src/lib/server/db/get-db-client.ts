import { env } from "$env/dynamic/private"
import type {IDbClient} from "$lib/types/db/db-client"
import { MockDbClient } from "$lib/server/db/mock-db-client"

let dbClient: IDbClient;

if (env.MOCK_DB === "true") {
  dbClient = new MockDbClient()
} else {
  throw new Error("No real database client implemented yet.")
}

export const getDbClient = (): IDbClient => dbClient
