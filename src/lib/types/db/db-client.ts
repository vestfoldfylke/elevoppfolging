import type { AccessEntry, FrontendStudent, StudentMemberships } from "../app-types.js"
import type {
  Access,
  AppStudent,
  AppUser,
  AuditEntry,
  AuditEntryInput,
  AuditSearchTerms,
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
  getSchool(schoolNumber: string): Promise<School | null>
  getSchools(): Promise<School[]>
  createSchool(school: NewSchool): Promise<string>
  updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string>
  deleteSchool(schoolNumber: string): Promise<void>
}

export interface IAccessDbClient {
  getPrincipalAccess(entraUserId: string): Promise<Access | null>
  getManualAccess(schoolNumber: string): Promise<Access[]>
  createAccess(access: NewAccess): Promise<string>
  addAccessEntry(entraUserId: string, schoolName: string, accessEntry: AccessEntry): Promise<string>
  removeAccessEntry(entraUserId: string, schoolName: string, accessEntry: ManualAccessEntryInput): Promise<string>
  getSchoolLeaderAccess(): Promise<Access[]>
  getStudentAccess(studentId: string, studentMemberships: StudentMemberships, studentProgramAreaIds: string[]): Promise<Access[]>
}

export interface IProgramAreasDbClient {
  getProgramArea(_id: string): Promise<ProgramArea | null>
  getProgramAreasFromClassIds(classSystemIds: string[]): Promise<ProgramArea[]>
  getProgramAreasForSchool(schoolNumber: string): Promise<ProgramArea[]>
  createProgramArea(schoolName: string, programArea: NewProgramArea): Promise<string>
  updateProgramArea(programAreaId: string, schoolName: string, programArea: NewProgramArea): Promise<string>
  deleteProgramArea(schoolName: string, programArea: ProgramArea): Promise<void>
}

export interface IStudentsDbClient {
  getAllStudents(): Promise<FrontendStudent[]>
  getStudentBySsn(ssn: string): Promise<FrontendStudent | null>
  getStudentById(studentId: string): Promise<AppStudent | null>
  createManualStudent(manualStudent: NewAppStudent): Promise<string>
  updateStudent(manualStudent: UpdateAppStudent): Promise<string>
}

export type StudentDocumentAccess = {
  studentId: string
  /** Direct school access derived from principalAccessForStudent */
  schoolNumbers: string[]
  /** Subset of schoolNumbers where the principal has school leader access */
  schoolLeaderSchoolNumbers: string[]
  /** Subset of schoolNumbers where the principal's only access type is subject teacher */
  subjectTeacherOnlySchoolNumbers: string[]
  /** When true, the principal has consent-based access to all of the student's schools */
  hasDataSharingConsent: boolean
  /** entraUserId of the principal — used to include documents the principal themselves created, even at subject-teacher-only schools */
  principalEntraUserId: string
}

export interface IDocumentsDbClient {
  getStudentDocuments(studentId: string): Promise<StudentDocument[]>
  getStudentDocumentById(documentId: string): Promise<StudentDocument | null>
  getStudentIdsWithoutDocuments(studentAccess: StudentDocumentAccess[]): Promise<string[]>
  getStudentIdsWithDocumentForTemplates(studentAccess: StudentDocumentAccess[], templateIds: string[]): Promise<string[]>
  createStudentDocument(document: NewStudentDocument): Promise<string>
  updateStudentDocument(documentId: string, documentUpdate: StudentDocumentUpdate): Promise<string>
  deleteStudentDocument(document: StudentDocument): Promise<void>

  addStudentDocumentMessage(documentId: string, schoolName: string, schoolNumber: string, message: NewDocumentMessage): Promise<string>
  updateStudentDocumentMessage(documentId: string, messageId: string, schoolName: string, schoolNumber: string, messageUpdate: NewDocumentMessage): Promise<string>

  getGroupDocuments(systemId: string): Promise<GroupDocument[]>
  getGroupDocumentById(documentId: string): Promise<GroupDocument | null>
  createGroupDocument(document: NewGroupDocument): Promise<string>
  updateGroupDocument(documentId: string, documentUpdate: GroupDocumentUpdate): Promise<string>
  deleteGroupDocument(document: GroupDocument): Promise<void>

  addGroupDocumentMessage(documentId: string, schoolName: string, schoolNumber: string, message: NewDocumentMessage): Promise<string>
  updateGroupDocumentMessage(documentId: string, messageId: string, schoolName: string, schoolNumber: string, messageUpdate: NewDocumentMessage): Promise<string>
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
  createEmailAlert(schoolName: string, schoolNumber: string, emailAlert: NewDbEmailAlert): Promise<string>
  deleteEmailAlertsByDocumentId(documentId: string): Promise<void>
}

export interface IAuditLogsDbClient {
  createAuditEntry(auditEntry: AuditEntryInput): Promise<string>
  getAuditEntries(searchTerms?: AuditSearchTerms): Promise<AuditEntry[]>
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
  auditLogs: IAuditLogsDbClient
}
