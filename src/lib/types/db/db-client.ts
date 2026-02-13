import type { FrontendOverviewStudent, FrontendStudent } from "../app-types.js"
import type { AuthenticatedPrincipal } from "../authentication.js"
import type {
  Access,
  DocumentContentTemplate,
  DocumentMessage,
  NewDocumentContentTemplate,
  NewDocumentMessage,
  NewStudentDocument,
  NewStudentImportantStuff,
  ProgramArea,
  StudentDocument,
  StudentImportantStuff
} from "./shared-types.js"

export interface IDbClient {
  getAccess(principal: AuthenticatedPrincipal): Promise<Access | null>
  getProgramArea(_id: string): Promise<ProgramArea | null>
  getStudents(access: Access): Promise<FrontendOverviewStudent[]>
  getStudentById(studentDbId: string): Promise<FrontendStudent | null>
  getStudentDocuments(studentDbId: string): Promise<StudentDocument[]>
  createStudentDocument(studentId: string, document: NewStudentDocument): Promise<string>
  addDocumentMessage(studentId: string, documentId: string, message: NewDocumentMessage): Promise<DocumentMessage>
  getStudentImportantStuff(studentId: string): Promise<StudentImportantStuff | null>
  upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<void>
  updateStudentLatestActivityTimestamp(studentId: string): Promise<void>
  getDocumentContentTemplates(): Promise<DocumentContentTemplate[]>
  createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string>
  updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string>
}
