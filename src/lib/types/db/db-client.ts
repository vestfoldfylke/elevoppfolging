import type { AccessEntry, FrontendStudent } from "../app-types.js"
import type {
  Access,
  AppUser,
  AvailableForDocumentType,
  DocumentContentTemplate,
  DocumentMessage,
  ManualAccessEntryInput,
  NewAccess,
  NewDocumentContentTemplate,
  NewDocumentMessage,
  NewSchool,
  NewStudentCheckBox,
  NewStudentDataSharingConsent,
  NewStudentDocument,
  NewStudentImportantStuff,
  ProgramArea,
  School,
  SchoolInfo,
  StudentCheckBox,
  StudentDataSharingConsent,
  StudentDocument,
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
  removeAccessEntry(entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<string>
  getSchoolLeaderAccess(): Promise<Access[]>

  getProgramArea(_id: string): Promise<ProgramArea | null>

  getAllStudents(): Promise<FrontendStudent[]>
  getStudents(access: Access): Promise<FrontendStudent[]>
  getStudentById(studentId: string): Promise<FrontendStudent | null>

  getStudentDocuments(studentId: string): Promise<StudentDocument[]>
  getStudentDocumentById(documentId: string): Promise<StudentDocument | null>
  createStudentDocument(document: NewStudentDocument): Promise<string>

  addDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<DocumentMessage>

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
  getStudentsDataSharingConsent(studentIds: string[]): Promise<Record<string, StudentDataSharingConsent>>
  upsertStudentDataSharingConsent(studentId: string, consent: NewStudentDataSharingConsent): Promise<string>

  getStudentCheckBoxes(): Promise<StudentCheckBox[]>
  createStudentCheckBox(studentCheckBox: NewStudentCheckBox): Promise<string>
  deleteStudentCheckBox(studentCheckBoxId: string): Promise<void>
  updateStudentCheckBox(studentCheckBoxId: string, studentCheckBox: NewStudentCheckBox): Promise<string>
}
