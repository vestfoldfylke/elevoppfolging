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

export type EditorData = {
  by: {
    entraUserId: string
    fallbackName: string
    displayName?: string
  }
  at: Date
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
  /** Alle FINT elevforholdene til eleven */
  studentEnrollments: StudentEnrollment[]
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
  /** Hvem har gitt tilgangen */
  granted: EditorData
  source: Source
}

export type SchoolLeaderManualAccessEntryInput = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  type: "MANUELL-SKOLELEDER-TILGANG"
}

export type SchoolLeaderManualAccessEntry = AccessEntryBase & SchoolLeaderManualAccessEntryInput

export type ManageManualStudentsManualAccessEntryInput = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  type: "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG"
}

export type ManageManualStudentsManualAccessEntry = AccessEntryBase & ManageManualStudentsManualAccessEntryInput

export type ProgramAreaManualAccessEntryInput = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** Entydig identifikator (db _id) for hvilket undervisningsområde det er gitt tilgang til */
  _id: string
  type: "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG"
}

export type DbProgramAreaManualAccessEntry = Omit<ProgramAreaManualAccessEntry, "_id"> & {
  _id: ObjectId
}

export type ProgramAreaManualAccessEntry = AccessEntryBase & ProgramAreaManualAccessEntryInput

export type StudentManualAccessEntryInput = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** Entydig identifikator (db _id) for hvilken elev det er gitt tilgang til */
  _id: string
  type: "MANUELL-ELEV-TILGANG"
}

export type StudentManualAccessEntry = AccessEntryBase & StudentManualAccessEntryInput

export type DbStudentManualAccessEntry = Omit<StudentManualAccessEntry, "_id"> & {
  _id: ObjectId
}

export type ClassManualAccessEntryInput = {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** Entydig identifikator (db _id) for hvilken klasse det er gitt tilgang til */
  systemId: string
  type: "MANUELL-KLASSE-TILGANG"
}

export type ClassManualAccessEntry = AccessEntryBase & ClassManualAccessEntryInput

export type ManualAccessEntryInput =
  | SchoolLeaderManualAccessEntryInput
  | ManageManualStudentsManualAccessEntryInput
  | ProgramAreaManualAccessEntryInput
  | StudentManualAccessEntryInput
  | ClassManualAccessEntryInput

export type ClassAutoAccessEntry = AccessEntryBase & {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** FINT system-id for klassen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-KLASSE-TILGANG"
}

export type ContactTeacherGroupAutoAccessEntry = AccessEntryBase & {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG"
}

export type TeachingGroupAutoAccessEntry = AccessEntryBase & {
  /** Hvilken skole gjelder tilgangen for */
  schoolNumber: string
  /** FINT system-id for undervisningsgruppen det er gitt tilgang til */
  systemId: string
  type: "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG"
}

export type NewAccess = {
  entraUserId: string
  name: string
  leaderForSchools: SchoolLeaderManualAccessEntry[]
  manageManualStudentsForSchools: ManageManualStudentsManualAccessEntry[]
  programAreas: ProgramAreaManualAccessEntry[]
  classes: (ClassAutoAccessEntry | ClassManualAccessEntry)[]
  contactTeacherGroups: ContactTeacherGroupAutoAccessEntry[]
  teachingGroups: TeachingGroupAutoAccessEntry[]
  students: StudentManualAccessEntry[]
}

export type NewDbAccess = Omit<NewAccess, "programAreas" | "students"> & {
  programAreas: DbProgramAreaManualAccessEntry[]
  students: DbStudentManualAccessEntry[]
}

export type Access = NewAccess & {
  _id: string
}

export type DbAccess = NewDbAccess & {
  _id: ObjectId
}

// APP USER

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
export type ProgramAreaInput = {
  name: string
  classes: {
    systemId: string
    name: string
  }[]
}

export type NewProgramArea = ProgramAreaInput & {
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

export type DocumentCheckboxItem = DocumentRadioButtonItem

export type DocumentRadioGroupItem = {
  type: "radioGroup"
  header: string
  items: DocumentRadioButtonItem[]
  selectedValue: string
  helpText?: string
}

export type DocumentCheckboxGroupItem = {
  type: "checkboxGroup"
  header: string
  items: DocumentCheckboxItem[]
  selectedValues: string[]
  helpText?: string
}

export type DocumentInputItem = DocumentTextInputItem | DocumentTextAreaItem | DocumentRadioGroupItem | DocumentCheckboxGroupItem

export type DocumentContentItem = DocumentHeaderItem | DocumentParagraphItem | DocumentInputItem

export type DocumentMessageBase = {
  created: EditorData
  modified: EditorData
}

export type DocumentCommentInput = {
  type: "comment"
  content: {
    text: string
  }
}

export type DocumentUpdateInput = {
  type: "update"
  content: {
    title: string
    text: string
  }
}

export type DocumentMessageInput = DocumentCommentInput | DocumentUpdateInput

export type DocumentComment = DocumentMessageBase & DocumentCommentInput

export type DocumentUpdate = DocumentMessageBase & DocumentUpdateInput

export type NewDocumentMessage = DocumentComment | DocumentUpdate

export type DocumentMessage = NewDocumentMessage & {
  messageId: string
}

export type DocumentBase = {
  created: EditorData
  modified: EditorData
}

export type DocumentInput = {
  school: SchoolInfo
  title: string
  template: {
    _id: string
    name: string
    version: number
  }
  content: DocumentContentItem[]
  /*
  accessTypes: AccessEntry["type"][]
  */
}

export type NewStudentDocument = DocumentBase &
  DocumentInput & {
    messages: DocumentMessage[]
    student: {
      _id: string
    }
  }

export type StudentDocumentUpdate = DocumentBase & DocumentInput

export type StudentDocument = NewStudentDocument & {
  _id: string
}

export type NewDbStudentDocument = Omit<NewStudentDocument, "student"> & {
  student: {
    _id: ObjectId
  }
}

export type DbStudentDocument = NewDbStudentDocument & {
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
  availableForDocumentType: AvailableForDocumentType // Hmm might need explicit difference here if we add specific types for student documents (like fag-selector and so on)
  created: EditorData
  modified: EditorData
  content: DocumentContentItem[]
  sort: number
}

export type DocumentContentTemplate = NewDocumentContentTemplate & {
  _id: string
}

export type DbDocumentContentTemplate = NewDocumentContentTemplate & {
  _id: ObjectId
}

// Student Check boxes
export type StudentCheckBoxInput = {
  type: "FACILITATION" | "FOLLOW_UP"
  value: string
  enabled: boolean
  sort: number
}

export type NewStudentCheckBox = StudentCheckBoxInput & {
  modified: EditorData
  created: EditorData
}

export type StudentCheckBox = NewStudentCheckBox & {
  _id: string
}

export type DbStudentCheckBox = NewStudentCheckBox & {
  _id: ObjectId
}

// Important Stuff

export type ImportantStuffBase = {
  created: EditorData
  modified: EditorData
}

export type StudentImportantStuffInput = {
  school: SchoolInfo
  importantInfo: string
  /** list of _ids corresponding to entries in student check boxes */
  followUp: string[]
  /** list of _ids corresponding to entries in student check boxes */
  facilitation: string[]
}

export type NewStudentImportantStuff = ImportantStuffBase &
  StudentImportantStuffInput & {
    type: "STUDENT"
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
  modified: EditorData
}

export type StudentDataSharingConsentInput = {
  consent: boolean
  message: string
}

export type NewStudentDataSharingConsent = StudentDataSharingConsentBase & StudentDataSharingConsentInput

export type StudentDataSharingConsent = NewStudentDataSharingConsent & {
  _id: string
  student: {
    _id: string
  }
}

export type NewDbStudentDataSharingConsent = StudentDataSharingConsentBase &
  StudentDataSharingConsentInput & {
    student: {
      _id: ObjectId
    }
  }

export type DbStudentDataSharingConsent = StudentDataSharingConsentBase &
  StudentDataSharingConsentInput & {
    _id: ObjectId
    student: {
      _id: ObjectId
    }
  }
