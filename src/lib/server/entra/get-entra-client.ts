import { env } from "$env/dynamic/private"
import { MockEntraClient } from "$lib/server/entra/mock-entra-client"
import type { IEntraClient } from "$lib/types/entra/entra-client"

let entraClient: IEntraClient

if (env.MOCK_ENTRA === "true") {
	entraClient = new MockEntraClient()
} else {
	throw new Error("No real database client implemented yet.")
}

export const getEntraClient = (): IEntraClient => entraClient
