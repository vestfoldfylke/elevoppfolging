import type { Access, AppStudent, ProgramArea, SimpleAppStudent } from "../app-types.js"
import type { AuthenticatedPrincipal } from "../authentication.js"

export interface IDbClient {
	getAccess(principal: AuthenticatedPrincipal): Promise<Access | null>
	getProgramArea(_id: string): Promise<ProgramArea | null>
	getStudents(access: Access): Promise<SimpleAppStudent[]>
	getStudentById(studentDbId: string): Promise<AppStudent | null>
}
