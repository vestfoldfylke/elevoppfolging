import type { Access, AppUser, IDbClient } from "$lib/types/db/db-client"
import type { AppStudent } from "$lib/types/student"

type MockDb = {
	access: Access[]
	students: AppStudent[]
	users: AppUser[]
}

const mockDb: MockDb = {
	access: [],
	students: [],
	users: []
}

export class MockDbClient implements IDbClient {
	async getStudents(): Promise<AppStudent[]> {
		return mockDb.students
	}

	async replaceStudents(students: AppStudent[]): Promise<void> {
		mockDb.students = students
	}

	async replaceUsers(users: AppUser[]): Promise<void> {
		mockDb.users = users
	}

	async getAccess(): Promise<Access[]> {
		return mockDb.access
	}

	async replaceAccess(accesses: Access[]): Promise<void> {
		mockDb.access = accesses
	}
}
