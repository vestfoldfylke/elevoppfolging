import type { FrontendOverviewStudent, FrontendStudent } from "../app-types.js"
import type { AuthenticatedPrincipal } from "../authentication.js"
import type {
  Access,
  AvailableForDocumentType,
  Document,
  DocumentContentTemplate,
  DocumentMessage,
  NewDocument,
  NewDocumentContentTemplate,
  NewDocumentMessage,
  NewStudentImportantStuff,
  ProgramArea,
  StudentImportantStuff
} from "./shared-types.js"

export interface IDbClient {
  getAccess(principal: AuthenticatedPrincipal): Promise<Access | null>
  getProgramArea(_id: string): Promise<ProgramArea | null>
  getStudents(access: Access): Promise<FrontendOverviewStudent[]>
  getStudentById(studentDbId: string): Promise<FrontendStudent | null>
  getStudentDocuments(studentDbId: string): Promise<Document[]>
  getDocumentById(documentId: string): Promise<Document | null>
  createDocument(document: NewDocument): Promise<string>
  addDocumentMessage(documentId: string, message: NewDocumentMessage, studentId?: string): Promise<DocumentMessage>
  getStudentImportantStuff(studentId: string): Promise<StudentImportantStuff | null>
  upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<void>
  updateStudentLatestActivityTimestamp(studentId: string): Promise<void>
  getDocumentContentTemplates(availableFor?: AvailableForDocumentType): Promise<DocumentContentTemplate[]>
  getDocumentContentTemplateById(templateId: string): Promise<DocumentContentTemplate | null>
  createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string>
  updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string>
  deleteDocumentContentTemplate(templateId: string): Promise<void>
}
