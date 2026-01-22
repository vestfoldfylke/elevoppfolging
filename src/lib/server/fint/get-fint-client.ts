import { env } from "$env/dynamic/private"
import type {IFintClient} from "$lib/types/fint/fint-client";
import {MockFintClient} from "$lib/server/fint/mock-fint-client";

let fintClient: IFintClient;

if (env.MOCK_DB === "true") {
  fintClient = new MockFintClient()
} else {
  throw new Error("No real database client implemented yet.")
}

export const getFintClient = (): IFintClient => fintClient
