import type { ObjectId } from "mongodb"

/** Undervisningsforhold & Skoleressurs */
export type Teacher = {
  /** entra objectid knyttet til en bruker i Users-collection hvis læreren finnes der */
  entraUserId: string | null
  systemId: string
  feideName: string
  name: string
}

export type Group = {
  systemId: string
  name: string
  source: Source
}

export type GroupMembership = {
  systemId: string
  period: Period
}

/** Klasse */
export type ClassGroup = Group & {
  teachers: Teacher[]
}

/** Klassemedlemskap */
export type ClassMembership = GroupMembership & {
  classGroup: ClassGroup
}

/** Undervisningsgruppe */
export type TeachingGroup = Group & {
  teachers: Teacher[]
}

/** Undervisningsgruppemedlemskap */
export type TeachingGroupMembership = GroupMembership & {
  teachingGroup: TeachingGroup
}

/** Kontaktlærergruppe */
export type ContactTeacherGroup = Group & {
  teachers: Teacher[]
}

/** Kontaktlærergruppemedlemskap */
export type ContactTeacherGroupMembership = GroupMembership & {
  contactTeacherGroup: ContactTeacherGroup
}

export type SchoolInfo = {
  name: string
  schoolNumber: string
}

export type NewSchool = SchoolInfo & {
  created: EditorData
  modified: EditorData
  source: Source
}

export type School = NewSchool & {
  _id: string
}

export type DbSchool = NewSchool & {
  _id: ObjectId
}

export type Period = {
  start: Date | null
  end: Date | null
}

/** Elevforhold */
export type StudentEnrollment = {
  systemId: string
  classMemberships: ClassMembership[]
  teachingGroupMemberships: TeachingGroupMembership[]
  contactTeacherGroupMemberships: ContactTeacherGroupMembership[]
  period: Period
  school: SchoolInfo
  mainSchool: boolean
  source: Source
}

export type MainSchool = SchoolInfo & {
  enrollmentSystemId: string
}

export type Source = "AUTO" | "MANUAL"

/** En elev i db for denne appen */
export type NewAppStudent = {
  /** FINT system-id for eleven */
  systemId: string
  studentNumber: string
  ssn: string
  name: string
  feideName: string
  studentEnrollments: StudentEnrollment[]
  /** FINT-elevforholdet som har hovedskole true */
  mainEnrollment: StudentEnrollment | null
  created: EditorData
  modified: EditorData
  source: Source
}

export type AppStudent = NewAppStudent & {
  _id: string
}

export type DbAppStudent = NewAppStudent & {
  _id: ObjectId
}

export type AccessEntryBase = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** Hvem har gitt tilgangen */
  granted: EditorData
  source: Source
}

export type SchoolManualAccessEntry = AccessEntryBase & {
  type: "MANUELL-SKOLELEDER-TILGANG"
}

export type ProgramAreaManualAccessEntry = AccessEntryBase & {
  /** Entydig identifikator (db _id) for hvilket undervisningsområde det er gitt tilgang til */
  _id: string
  type: "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG"
}

export type StudentManualAccessEntry = AccessEntryBase & {
  /** db _id for eleven det er gitt tilgang til */
  _id: string
  type: "MANUELL-ELEV-TILGANG"
}

export type ClassAutoAccessEntry = AccessEntryBase & {
  /** FINT system-id for klassen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-KLASSE-TILGANG"
}

export type ClassManualAccessEntry = AccessEntryBase & {
  /** FINT system-id for klassen det er gitt tilgang til */
  systemId: string
  type: "MANUELL-KLASSE-TILGANG"
}

export type ContactTeacherGroupAutoAccessEntry = AccessEntryBase & {
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG"
}

export type TeachingGroupAutoAccessEntry = AccessEntryBase & {
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG"
}

export type NewAccess = {
  entraUserId: string
  name: string
  schools: SchoolManualAccessEntry[]
  programAreas: ProgramAreaManualAccessEntry[]
  classes: (ClassAutoAccessEntry | ClassManualAccessEntry)[]
  contactTeacherGroups: ContactTeacherGroupAutoAccessEntry[]
  teachingGroups: TeachingGroupAutoAccessEntry[]
  students: StudentManualAccessEntry[]
}

export type Access = NewAccess & {
  _id: string
}

export type DbAccess = NewAccess & {
  _id: ObjectId
}

export type NewAppUser = {
  active: boolean
  feideName: string
  entra: {
    id: string
    userPrincipalName: string
    displayName: string
    companyName: string
    department: string
  }
  created: EditorData
  modified: EditorData
  source: Source
}

export type AppUser = NewAppUser & {
  _id: string
}

export type DbAppUser = NewAppUser & {
  _id: ObjectId
}

// PROGRAM AREA
export type NewProgramArea = {
  name: string
  classes: {
    systemId: string
    name: string
  }[]
  created: EditorData
  modified: EditorData
  source: Source
}

export type ProgramArea = NewProgramArea & {
  _id: string
}

export type DbProgramArea = NewProgramArea & {
  _id: ObjectId
}

// DOCUMENTS

export type DocumentHeaderItem = {
  type: "header"
  value: string
}

export type DocumentParagraphItem = {
  type: "paragraph"
  value: string
}

export type DocumentTextInputItem = {
  type: "inputText"
  label: string
  value: string
  required: boolean
  placeholder?: string
  helpText?: string
}

export type DocumentTextAreaItem = {
  type: "textarea"
  label: string
  value: string
  required: boolean
  initialRows: number
  placeholder?: string
  helpText?: string
}

export type DocumentRadioButtonItem = {
  label: string
  value: string
}

export type DocumentRadioGroupItem = {
  type: "radioGroup"
  header: string
  items: DocumentRadioButtonItem[]
  selectedValue: string
  required: boolean
  helpText?: string
}

export type DocumentInputItem = DocumentTextInputItem | DocumentTextAreaItem | DocumentRadioGroupItem

export type DocumentContentItem = DocumentHeaderItem | DocumentParagraphItem | DocumentInputItem

export type EditorData = {
  by: {
    entraUserId: string
    fallbackName: string
    displayName?: string
  }
  at: Date
}

export type DocumentMessageBase = {
  created: EditorData
  modified: EditorData
}

export type DocumentComment = DocumentMessageBase & {
  type: "comment"
  content: {
    text: string
  }
}

export type NewDocumentMessage = DocumentComment

export type DocumentMessage = NewDocumentMessage & {
  messageId: string
}

export type DocumentBase = {
  school: SchoolInfo
  title: string
  created: EditorData
  modified: EditorData
  template: {
    _id: string
    name: string
    version: number
  }
  content: DocumentContentItem[]
  messages: DocumentMessage[]
  group?: {
    systemId: string
  }
}

export type NewDocument = DocumentBase & {
  student?: {
    _id: string
  }
}

export type Document = NewDocument & {
  _id: string
}

export type NewDbDocument = DocumentBase & {
  student?: {
    _id: ObjectId
  }
}

export type DbDocument = NewDbDocument & {
  _id: ObjectId
}

export type AvailableForDocumentType = {
  student: boolean
  group: boolean
}

// Document content templates
export type NewDocumentContentTemplate = {
  name: string
  version: number
  availableForDocumentType: AvailableForDocumentType
  created: EditorData
  modified: EditorData
  content: DocumentContentItem[]
}

export type DocumentContentTemplate = NewDocumentContentTemplate & {
  _id: string
}

export type DbDocumentContentTemplate = NewDocumentContentTemplate & {
  _id: ObjectId
}

// Important Stuff

export type ImportantStuffBase = {
  created: EditorData
  modified: EditorData
  importantInfo: string
  school: SchoolInfo
}

export type NewStudentImportantStuff = ImportantStuffBase & {
  type: "STUDENT"
  followUp: string[]
  facilitation: string[]
  lastActivityTimestamp: Date
}

export type StudentImportantStuff = NewStudentImportantStuff & {
  _id: string
  student: {
    _id: string
  }
}

export type NewDbStudentImportantStuff = NewStudentImportantStuff & {
  student: {
    _id: ObjectId
  }
}

export type DbStudentImportantStuff = NewStudentImportantStuff & {
  _id: ObjectId
  student: {
    _id: ObjectId
  }
}

// StudentDataSharingConsent

export type StudentDataSharingConsentBase = {
  created: EditorData
  modified: EditorData
  consent: boolean
  message: string
}

export type NewStudentDataSharingConsent = StudentDataSharingConsentBase & {
  student: {
    _id: string
  }
}

export type StudentDataSharingConsent = NewStudentDataSharingConsent & {
  _id: string
}

export type NewDbStudentDataSharingConsent = StudentDataSharingConsentBase & {
  student: {
    _id: ObjectId
  }
}

export type DbStudentDataSharingConsent = StudentDataSharingConsentBase & {
  _id: ObjectId
  student: {
    _id: ObjectId
  }
}
