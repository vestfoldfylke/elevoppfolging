import type { SimpleAppStudent } from "../app-types.js"
import type { AuthenticatedPrincipal } from "../authentication.js"
import type { Access, AppStudent, DocumentMessage, NewDocumentMessage, NewStudentDocument, ProgramArea, StudentDocument } from "./shared-types.js"

export interface IDbClient {
	getAccess(principal: AuthenticatedPrincipal): Promise<Access | null>
	getProgramArea(_id: string): Promise<ProgramArea | null>
	getStudents(access: Access): Promise<SimpleAppStudent[]>
	getStudentById(studentDbId: string): Promise<AppStudent | null>
	getStudentDocuments(studentDbId: string): Promise<StudentDocument[]>
	createStudentDocument(document: NewStudentDocument): Promise<string>
	addDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<DocumentMessage>
}
