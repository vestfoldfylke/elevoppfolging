import type { User } from "@microsoft/microsoft-graph-types"

export interface IEntraClient {
	getEnterpriseApplicationUsers(): Promise<User[]>
}
