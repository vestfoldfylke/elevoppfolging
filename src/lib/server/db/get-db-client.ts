import { env } from "$env/dynamic/private"
import type { IDbClient } from "$lib/types/db/db-client"
import { MongoDbClient } from "./mongodb-client"

let dbClient: IDbClient

if (env.MOCK_DB === "true") {
	throw new Error("Mock DB client is not implemented yet")
} else {
	dbClient = new MongoDbClient()
}

export const getDbClient = (): IDbClient => dbClient
