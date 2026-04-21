import type { AccessEntry, FrontendStudent, StudentMemberships } from "../app-types.js"
import type {
  Access,
  AppStudent,
  AppUser,
  AvailableForDocumentType,
  DocumentContentTemplate,
  ManualAccessEntryInput,
  NewAccess,
  NewAppStudent,
  NewDocumentContentTemplate,
  NewDocumentMessage,
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
  getProgramAreasFromClassIds(classSystemIds: string[]): Promise<ProgramArea[]>
  getProgramAreasForSchool(schoolNumber: string): Promise<ProgramArea[]>
  createProgramArea(programArea: NewProgramArea): Promise<string>
  updateProgramArea(programAreaId: string, programArea: NewProgramArea): Promise<string>
  deleteProgramArea(programArea: ProgramArea): Promise<void>

  getAllStudents(): Promise<FrontendStudent[]>
  getStudents(access: Access): Promise<FrontendStudent[]>
  getStudentById(studentId: string): Promise<FrontendStudent | null>
  getStudentBySsn(ssn: string): Promise<FrontendStudent | null>
  getManualStudentById(studentId: string): Promise<AppStudent | null>

  getStudentAccess(studentId: string, studentMemberships: StudentMemberships, studentProgramAreaIds: string[]): Promise<Access[]>

  getStudentDocuments(studentId: string): Promise<StudentDocument[]>
  getStudentDocumentById(documentId: string): Promise<StudentDocument | null>
  createStudentDocument(document: NewStudentDocument): Promise<string>
  updateStudentDocument(documentId: string, documentUpdate: StudentDocumentUpdate): Promise<string>

  createManualStudent(manualStudent: NewAppStudent): Promise<string>
  updateManualStudent(manualStudent: UpdateAppStudent): Promise<string>

  addDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string>

  getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>>
  getStudentImportantStuff(studentId: string, schoolNumbers: string[]): Promise<StudentImportantStuff[]>
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
  deleteStudentCheckBox(studentCheckBox: StudentCheckBox): Promise<void>
  updateStudentCheckBox(studentCheckBoxId: string, studentCheckBox: NewStudentCheckBox): Promise<string>
}
