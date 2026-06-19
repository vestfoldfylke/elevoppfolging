import type { IDbClient } from "$lib/types/db/db-client"

const notImplemented = () => {
  throw new Error("Not implemented")
}

export const mockDbClient: IDbClient = {
  appUsers: {
    getAllAppUsers: notImplemented,
    getAppUser: notImplemented
  },
  schools: {
    getSchools: notImplemented,
    createSchool: notImplemented,
    updateSchool: notImplemented,
    deleteSchool: notImplemented
  },
  access: {
    getPrincipalAccess: notImplemented,
    getManualAccess: notImplemented,
    createAccess: notImplemented,
    addAccessEntry: notImplemented,
    removeAccessEntry: notImplemented,
    getSchoolLeaderAccess: notImplemented,
    getStudentAccess: notImplemented
  },
  programAreas: {
    getProgramArea: notImplemented,
    getProgramAreasFromClassIds: notImplemented,
    getProgramAreasForSchool: notImplemented,
    createProgramArea: notImplemented,
    updateProgramArea: notImplemented,
    deleteProgramArea: notImplemented
  },
  students: {
    getAllStudents: notImplemented,
    getStudentBySsn: notImplemented,
    getStudentById: notImplemented,
    createManualStudent: notImplemented,
    updateStudent: notImplemented
  },
  documents: {
    getStudentDocuments: notImplemented,
    getStudentDocumentById: notImplemented,
    getStudentIdsWithoutDocuments: notImplemented,
    getStudentIdsWithDocumentForTemplates: notImplemented,
    createStudentDocument: notImplemented,
    updateStudentDocument: notImplemented,
    deleteStudentDocument: notImplemented,
    addStudentDocumentMessage: notImplemented,
    updateStudentDocumentMessage: notImplemented,
    getGroupDocuments: notImplemented,
    getGroupDocumentById: notImplemented,
    createGroupDocument: notImplemented,
    updateGroupDocument: notImplemented,
    deleteGroupDocument: notImplemented,
    addGroupDocumentMessage: notImplemented,
    updateGroupDocumentMessage: notImplemented
  },
  importantStuff: {
    getStudentsImportantStuff: notImplemented,
    getStudentImportantStuff: notImplemented,
    upsertStudentImportantStuff: notImplemented,
    updateStudentLastActivityTimestamp: notImplemented,
    getGroupImportantStuff: notImplemented,
    upsertGroupImportantStuff: notImplemented
  },
  documentContentTemplates: {
    getDocumentContentTemplates: notImplemented,
    getDocumentContentTemplateById: notImplemented,
    createDocumentContentTemplate: notImplemented,
    updateDocumentContentTemplate: notImplemented,
    deleteDocumentContentTemplate: notImplemented
  },
  studentDataSharingConsents: {
    getStudentDataSharingConsent: notImplemented,
    getStudentsDataSharingConsent: notImplemented,
    upsertStudentDataSharingConsent: notImplemented
  },
  studentCheckBoxes: {
    getStudentCheckBoxes: notImplemented,
    createStudentCheckBox: notImplemented,
    deleteStudentCheckBox: notImplemented,
    updateStudentCheckBox: notImplemented
  },
  emailAlerts: {
    createEmailAlert: notImplemented,
    deleteEmailAlertsByDocumentId: notImplemented
  },
  auditLogs: {
    createAuditEntry: notImplemented,
    getAuditEntries: notImplemented
  }
}
