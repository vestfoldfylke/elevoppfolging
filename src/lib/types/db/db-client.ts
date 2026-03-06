import type { AccessEntry, FrontendStudent } from "../app-types.js"
import type {
  Access,
  AppUser,
  AvailableForDocumentType,
  Document,
  DocumentContentTemplate,
  DocumentMessage,
  NewAccess,
  NewDocument,
  NewDocumentContentTemplate,
  NewDocumentMessage,
  NewSchool,
  NewStudentDataSharingConsent,
  NewStudentImportantStuff,
  ProgramArea,
  School,
  SchoolInfo,
  StudentDataSharingConsent,
  StudentImportantStuff
} from "./shared-types.js"

export interface IDbClient {
  getAllAppUsers(): Promise<AppUser[]>
  getAppUser(entraUserId: string): Promise<AppUser | null>

  getSchools(): Promise<School[]>
  createSchool(school: NewSchool): Promise<string>
  updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string>
  deleteSchool(schoolNumber: string): Promise<void>

  getPrincipalAccess(entraUserId: string): Promise<Access | null>
  getManualAccess(schoolNumber: string): Promise<Access[]>
  createAccess(access: NewAccess): Promise<string>
  addAccessEntry(entraUserId: string, accessEntry: AccessEntry): Promise<string>
  removeAccessEntry(entraUserId: string, accessEntry: AccessEntry): Promise<string>
  getSchoolLeaderAccess(): Promise<Access[]>

  getProgramArea(_id: string): Promise<ProgramArea | null>

  getStudents(access: Access): Promise<FrontendStudent[]>
  getStudentById(studentDbId: string): Promise<FrontendStudent | null>

  getStudentDocuments(studentDbId: string): Promise<Document[]>
  getDocumentById(documentId: string): Promise<Document | null>
  createDocument(document: NewDocument): Promise<string>
  addDocumentMessage(documentId: string, message: NewDocumentMessage, studentId?: string): Promise<DocumentMessage>

  getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>>
  getStudentImportantStuff(studentId: string, schoolNumber: string): Promise<StudentImportantStuff | null>
  upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<string>
  updateStudentLastActivityTimestamp(studentId: string, school: SchoolInfo): Promise<string>

  getDocumentContentTemplates(availableFor?: AvailableForDocumentType): Promise<DocumentContentTemplate[]>
  getDocumentContentTemplateById(templateId: string): Promise<DocumentContentTemplate | null>
  createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string>
  updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string>
  deleteDocumentContentTemplate(templateId: string): Promise<void>

  getStudentDataSharingConsent(studentId: string): Promise<StudentDataSharingConsent | null>
  upsertStudentDataSharingConsent(studentId: string, consent: NewStudentDataSharingConsent): Promise<string>
}
