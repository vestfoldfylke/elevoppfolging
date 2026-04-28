import type { AccessEntry, FrontendStudent, StudentMemberships } from "../app-types.js"
import type {
  Access,
  AppStudent,
  AppUser,
  AvailableForDocumentType,
  DocumentContentTemplate,
  GroupDocument,
  GroupDocumentUpdate,
  GroupImportantStuff,
  ManualAccessEntryInput,
  NewAccess,
  NewAppStudent,
  NewDbEmailAlert,
  NewDocumentContentTemplate,
  NewDocumentMessage,
  NewGroupDocument,
  NewGroupImportantStuff,
  NewProgramArea,
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
  StudentDocumentUpdate,
  StudentImportantStuff,
  UpdateAppStudent
} from "./shared-types.js"

export interface IAppUsersDbClient {
  getAllAppUsers(): Promise<AppUser[]>
  getAppUser(entraUserId: string): Promise<AppUser | null>
}

export interface ISchoolsDbClient {
  getSchools(): Promise<School[]>
  createSchool(school: NewSchool): Promise<string>
  updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string>
  deleteSchool(schoolNumber: string): Promise<void>
}

export interface IAccessDbClient {
  getPrincipalAccess(entraUserId: string): Promise<Access | null>
  getManualAccess(schoolNumber: string): Promise<Access[]>
  createAccess(access: NewAccess): Promise<string>
  addAccessEntry(entraUserId: string, accessEntry: AccessEntry): Promise<string>
  removeAccessEntry(entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<string>
  getSchoolLeaderAccess(): Promise<Access[]>
  getStudentAccess(studentId: string, studentMemberships: StudentMemberships, studentProgramAreaIds: string[]): Promise<Access[]>
}

export interface IProgramAreasDbClient {
  getProgramArea(_id: string): Promise<ProgramArea | null>
  getProgramAreasFromClassIds(classSystemIds: string[]): Promise<ProgramArea[]>
  getProgramAreasForSchool(schoolNumber: string): Promise<ProgramArea[]>
  createProgramArea(programArea: NewProgramArea): Promise<string>
  updateProgramArea(programAreaId: string, programArea: NewProgramArea): Promise<string>
  deleteProgramArea(programArea: ProgramArea): Promise<void>
}

export interface IStudentsDbClient {
  getAllStudents(): Promise<FrontendStudent[]>
  getStudentBySsn(ssn: string): Promise<FrontendStudent | null>
  getManualStudentById(studentId: string): Promise<AppStudent | null>
  createManualStudent(manualStudent: NewAppStudent): Promise<string>
  updateManualStudent(manualStudent: UpdateAppStudent): Promise<string>
}

export interface IDocumentsDbClient {
  getStudentDocuments(studentId: string): Promise<StudentDocument[]>
  getStudentDocumentById(documentId: string): Promise<StudentDocument | null>
  createStudentDocument(document: NewStudentDocument): Promise<string>
  updateStudentDocument(documentId: string, documentUpdate: StudentDocumentUpdate): Promise<string>

  addStudentDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string>
  updateStudentDocumentMessage(documentId: string, messageId: string, messageUpdate: NewDocumentMessage): Promise<string>

  getGroupDocuments(systemId: string): Promise<GroupDocument[]>
  getGroupDocumentById(documentId: string): Promise<GroupDocument | null>
  createGroupDocument(document: NewGroupDocument): Promise<string>
  updateGroupDocument(documentId: string, documentUpdate: GroupDocumentUpdate): Promise<string>

  addGroupDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string>
  updateGroupDocumentMessage(documentId: string, messageId: string, messageUpdate: NewDocumentMessage): Promise<string>
}

export interface IImportantStuffDbClient {
  getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>>
  getStudentImportantStuff(studentId: string, schoolNumbers: string[]): Promise<StudentImportantStuff[]>
  upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<string>
  updateStudentLastActivityTimestamp(studentId: string, school: SchoolInfo): Promise<string>

  /** We need to query by systemId since classes only exists on students and don't have a db record themselves */
  getGroupImportantStuff(systemId: string): Promise<GroupImportantStuff[]>
  /** We need to query by systemId since classes only exists on students and don't have a db record themselves */
  upsertGroupImportantStuff(systemId: string, importantStuff: NewGroupImportantStuff): Promise<string>
}

export interface IDocumentContentTemplatesDbClient {
  getDocumentContentTemplates(availableFor?: AvailableForDocumentType): Promise<DocumentContentTemplate[]>
  getDocumentContentTemplateById(templateId: string): Promise<DocumentContentTemplate | null>
  createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string>
  updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string>
  deleteDocumentContentTemplate(templateId: string): Promise<void>
}

export interface IStudentDataSharingConsentsDbClient {
  getStudentDataSharingConsent(studentId: string): Promise<StudentDataSharingConsent | null>
  getStudentsDataSharingConsent(studentIds: string[]): Promise<Record<string, StudentDataSharingConsent>>
  upsertStudentDataSharingConsent(studentId: string, consent: NewStudentDataSharingConsent): Promise<string>
}

export interface IStudentCheckBoxDbClient {
  getStudentCheckBoxes(): Promise<StudentCheckBox[]>
  createStudentCheckBox(studentCheckBox: NewStudentCheckBox): Promise<string>
  deleteStudentCheckBox(studentCheckBox: StudentCheckBox): Promise<void>
  updateStudentCheckBox(studentCheckBoxId: string, studentCheckBox: NewStudentCheckBox): Promise<string>
}

export interface IEmailAlertsDbClient {
  createEmailAlert(emailAlert: NewDbEmailAlert): Promise<string>
}

export interface IDbClient {
  appUsers: IAppUsersDbClient
  schools: ISchoolsDbClient
  access: IAccessDbClient
  programAreas: IProgramAreasDbClient
  students: IStudentsDbClient
  documents: IDocumentsDbClient
  importantStuff: IImportantStuffDbClient
  documentContentTemplates: IDocumentContentTemplatesDbClient
  studentDataSharingConsents: IStudentDataSharingConsentsDbClient
  studentCheckBoxes: IStudentCheckBoxDbClient
  emailAlerts: IEmailAlertsDbClient
}
