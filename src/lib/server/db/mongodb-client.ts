import { logger } from "@vestfoldfylke/loglady"
import { type Db, type Filter, MongoClient, ObjectId, type WithId } from "mongodb"
import { env } from "$env/dynamic/private"
import type { AccessEntry, FrontendStudent } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { KeysToNumber } from "$lib/types/db/db-helpers"
import type {
  Access,
  AppUser,
  AvailableForDocumentType,
  DbAccess,
  DbAppStudent,
  DbDocument,
  DbDocumentContentTemplate,
  DbProgramArea,
  DbSchool,
  DbStudentDataSharingConsent,
  DbStudentImportantStuff,
  Document,
  DocumentContentTemplate,
  DocumentMessage,
  EditorData,
  ManualAccessEntryInput,
  NewAccess,
  NewDbDocument,
  NewDbStudentDataSharingConsent,
  NewDbStudentImportantStuff,
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
} from "$lib/types/db/shared-types"

export class MongoDbClient implements IDbClient {
  private readonly mongoClient: MongoClient
  private db: Db | null = null
  private readonly schoolsCollectionName = "schools"
  private readonly accessCollectionName = "access"
  private readonly studentsCollectionName = "students"
  private readonly usersCollectionName = "users"
  private readonly importantStuffCollectionName = "important-stuff"
  private readonly programAreasCollectionName = "program-areas"
  private readonly documentsCollectionName = "documents"
  private readonly documentContentTemplatesCollectionName = "document-content-templates"
  private readonly studentDataSharingConsentsCollectionName = "student-data-sharing-consents"

  constructor() {
    if (!env.MONGODB_CONNECTION_STRING) {
      throw new Error("MONGODB_CONNECTION_STRING is not set (du har glemt den)")
    }
    this.mongoClient = new MongoClient(env.MONGODB_CONNECTION_STRING)
  }

  private async getDb(): Promise<Db> {
    if (this.db) {
      return this.db
    }
    try {
      await this.mongoClient.connect()
      this.db = this.mongoClient.db(env.MONGODB_DATABASE_NAME)
      return this.db
    } catch (error) {
      logger.errorException(error, "Error when connecting to MongoDB")
      throw error
    }
  }

  async getAllAppUsers(): Promise<AppUser[]> {
    const db = await this.getDb()
    const usersCollection = db.collection<AppUser>(this.usersCollectionName)
    const appUsers = await usersCollection.find({}).toArray()
    return appUsers.map((appUser) => {
      return {
        ...appUser,
        _id: appUser._id.toString()
      }
    })
  }

  async getAppUser(entraUserId: string): Promise<AppUser | null> {
    const db = await this.getDb()
    const usersCollection = db.collection<AppUser>(this.usersCollectionName)
    const appUser = await usersCollection.findOne({ entraUserId })
    if (!appUser) {
      return null
    }
    return {
      ...appUser,
      _id: appUser._id.toString()
    }
  }

  async getSchools(): Promise<School[]> {
    const db = await this.getDb()
    const schoolsCollection = db.collection<School>(this.schoolsCollectionName)
    const schools = await schoolsCollection.find({}).toArray()
    return schools.map((school) => {
      return {
        ...school,
        _id: school._id.toString()
      }
    })
  }

  async createSchool(newSchool: NewSchool): Promise<string> {
    const db = await this.getDb()

    const existingSchool = await db.collection<DbSchool>(this.schoolsCollectionName).find({ schoolNumber: newSchool.schoolNumber }).toArray()
    if (existingSchool.length > 0) {
      throw new Error(`School with schoolNumber: ${newSchool.schoolNumber} already exists`)
    }

    const schoolsCollection = db.collection<NewSchool>(this.schoolsCollectionName)
    const result = await schoolsCollection.insertOne(newSchool)
    if (!result.insertedId) {
      throw new Error("Failed to create school")
    }
    return result.insertedId.toString()
  }

  async updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string> {
    const db = await this.getDb()
    const schoolsCollection = db.collection<DbSchool>(this.schoolsCollectionName)
    const result = await schoolsCollection.updateOne({ schoolNumber }, { $set: schoolData })
    if (result.matchedCount === 0) {
      throw new Error(`School with schoolNumber: ${schoolNumber} not found`)
    }
    if (result.modifiedCount === 0) {
      throw new Error(`Failed to update school with schoolNumber: ${schoolNumber}`)
    }
    return schoolNumber
  }

  async deleteSchool(schoolNumber: string): Promise<void> {
    const db = await this.getDb()
    const schoolsCollection = db.collection<DbSchool>(this.schoolsCollectionName)
    const result = await schoolsCollection.deleteOne({ schoolNumber })
    if (result.deletedCount === 0) {
      throw new Error(`Failed to delete school with schoolNumber: ${schoolNumber}`)
    }
  }

  async getPrincipalAccess(entraUserId: string): Promise<Access | null> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    const access = await accessCollection.findOne({ entraUserId })
    if (!access) {
      return null
    }

    return {
      ...access,
      _id: access._id.toString()
    }
  }

  async getSchoolLeaderAccess(): Promise<Access[]> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    const accessList = await accessCollection.find({ schools: { $exists: true, $ne: [] } }).toArray()
    return accessList.map((access) => {
      return {
        ...access,
        _id: access._id.toString()
      }
    })
  }

  async createAccess(access: NewAccess): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<NewAccess>(this.accessCollectionName)
    const result = await accessCollection.insertOne(access)
    if (!result.insertedId) {
      throw new Error("Failed to create access")
    }
    return result.insertedId.toString()
  }

  async addAccessEntry(entraUserId: string, accessEntry: AccessEntry): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    let updateResult: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { schools: accessEntry } })
        break
      case "MANUELL-ELEV-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { students: accessEntry } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { classes: accessEntry } })
        break
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { programAreas: accessEntry } })
        break
      default:
        throw new Error(`Invalid access entry type: ${accessEntry.type}`)
    }
    if (!updateResult || !updateResult._id) {
      throw new Error("Failed to add access entry")
    }
    return updateResult._id.toString()
  }

  async removeAccessEntry(entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    let updatedAccess: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { schools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-ELEV-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { students: { _id: accessEntry._id, schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { classes: { systemId: accessEntry.systemId, schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { programAreas: { _id: accessEntry._id, schoolNumber: accessEntry.schoolNumber } } })
        break
    }
    if (!updatedAccess || !updatedAccess._id) {
      throw new Error("Failed to remove access entry")
    }
    return updatedAccess._id.toString()
  }

  async getManualAccess(schoolNumber: string): Promise<Access[]> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    const accessList = await accessCollection
      .find({
        $or: [
          {
            programAreas: { $exists: true, $ne: [], $elemMatch: { schoolNumber } }
          },
          {
            classes: { $exists: true, $ne: [], $elemMatch: { schoolNumber, type: "MANUELL-KLASSE-TILGANG" } }
          },
          {
            students: { $exists: true, $ne: [], $elemMatch: { schoolNumber } }
          }
        ]
      })
      .toArray()
    return accessList.map((access) => {
      return {
        _id: access._id.toString(),
        entraUserId: access.entraUserId,
        name: access.name,
        schools: [],
        programAreas: access.programAreas.filter((programArea) => programArea.schoolNumber === schoolNumber),
        classes: access.classes.filter((classAccess) => classAccess.type === "MANUELL-KLASSE-TILGANG" && classAccess.schoolNumber === schoolNumber),
        students: access.students.filter((studentAccess) => studentAccess.schoolNumber === schoolNumber),
        contactTeacherGroups: [],
        teachingGroups: []
      }
    })
  }

  async getProgramArea(_id: string): Promise<ProgramArea | null> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<DbProgramArea>(this.programAreasCollectionName)
    const programArea = await programAreasCollection.findOne({ _id: new ObjectId(_id) })

    if (!programArea) {
      return null
    }

    return {
      ...programArea,
      _id: programArea._id.toString()
    }
  }

  async getAllStudents(): Promise<FrontendStudent[]> {
    const db = await this.getDb()
    const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)
    
    const projection: KeysToNumber<WithId<FrontendStudent>> = {
      _id: 1,
      feideName: 1,
      name: 1,
      studentNumber: 1,
      systemId: 1,
      created: 1,
      modified: 1,
      source: 1,
      studentEnrollments: 1,
    }

    const students = await studentsCollection.find<FrontendStudent>({}, { projection }).toArray()
    
    return students.map((student) => ({
      ...student,
      _id: student._id.toString()
    }))
  }

  async getStudents(access: Access): Promise<FrontendStudent[]> {
    const db = await this.getDb()
    const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)

    const query: Filter<DbAppStudent> = {}
    query.$or = [] // ts doesn't understand that this is defined, if defined in the object above

    for (const schoolAccessEntry of access.schools) {
      query.$or.push({ "studentEnrollments.school.schoolNumber": schoolAccessEntry.schoolNumber })
    }

    const accessEntryNotInSchoolsAccess = (accessEntry: AccessEntry): boolean => {
      return !access.schools.some(school => school.schoolNumber === accessEntry.schoolNumber)
    }

    const studentAccessEntries = access.students.filter(accessEntryNotInSchoolsAccess)
    const programAreaAccessEntries = access.programAreas.filter(accessEntryNotInSchoolsAccess)
    const contactTeacherGroupAccessEntries = access.contactTeacherGroups.filter(accessEntryNotInSchoolsAccess)
    const classAccessEntries = access.classes.filter(accessEntryNotInSchoolsAccess)
    const teachingGroupAccessEntries = access.teachingGroups.filter(accessEntryNotInSchoolsAccess)

    const schoolsToAddToQuery = [...new Set<string>([
      ...programAreaAccessEntries.map(programArea => programArea.schoolNumber),
      ...studentAccessEntries.map(student => student.schoolNumber),
      ...classAccessEntries.map(classAccess => classAccess.schoolNumber),
      ...contactTeacherGroupAccessEntries.map(contactTeacherGroupAccess => contactTeacherGroupAccess.schoolNumber),
      ...teachingGroupAccessEntries.map(teachingGroupAccess => teachingGroupAccess.schoolNumber)
    ])]

    // Expand programareas right here, and cache it (add them to classSystemIds) - get it from function that has caching (or get them once somewhere else and pass them in)

    for (const schoolNumber of schoolsToAddToQuery) {
      const schoolQuery: Filter<DbAppStudent> = { "studentEnrollments.school.schoolNumber": schoolNumber, $or: [] }
      
      const studentIds = studentAccessEntries.filter(studentAccess => studentAccess.schoolNumber === schoolNumber).map(studentAccess => studentAccess._id)
      if (studentIds.length > 0) {
        schoolQuery.$or?.push({ _id: { $in: studentIds.map(id => new ObjectId(id)) } })
      }

      const contactTeacherGroupSystemIds = contactTeacherGroupAccessEntries.filter(contactTeacherGroupAccess => contactTeacherGroupAccess.schoolNumber === schoolNumber).map(contactTeacherGroupAccess => contactTeacherGroupAccess.systemId)
      if (contactTeacherGroupSystemIds.length > 0) {
        schoolQuery.$or?.push({ "studentEnrollments.contactTeacherGroupMemberships.contactTeacherGroup.systemId": { $in: contactTeacherGroupSystemIds } })
      }

      const classSystemIds = classAccessEntries.filter(classAccess => classAccess.schoolNumber === schoolNumber).map(classAccess => classAccess.systemId)
      if (classSystemIds.length > 0) {
        schoolQuery.$or?.push({ "studentEnrollments.classMemberships.classGroup.systemId": { $in: classSystemIds } })
      }

      const teachingGroupSystemIds = teachingGroupAccessEntries.filter(teachingGroupAccess => teachingGroupAccess.schoolNumber === schoolNumber).map(teachingGroupAccess => teachingGroupAccess.systemId)
      if (teachingGroupSystemIds.length > 0) {
        schoolQuery.$or?.push({ "studentEnrollments.teachingGroupMemberships.teachingGroup.systemId": { $in: teachingGroupSystemIds } })
      }

      query.$or.push(schoolQuery)
    }

    const projection: KeysToNumber<WithId<FrontendStudent>> = {
      _id: 1,
      feideName: 1,
      name: 1,
      studentNumber: 1,
      systemId: 1,
      created: 1,
      modified: 1,
      source: 1,
      studentEnrollments: 1,
    }

    const superAllStudent = await studentsCollection.find<FrontendStudent>(query, { projection }).toArray()

    return superAllStudent.map((student) => {
      return {
        ...student,
        _id: student._id.toString()
      }
    })
  }

  async getStudentById(studentId: string): Promise<FrontendStudent | null> {
    const db = await this.getDb()
    const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)
    logger.info("Getting student by _id {studentId}", studentId)

    const projection: KeysToNumber<WithId<FrontendStudent>> = {
      _id: 1,
      feideName: 1,
      name: 1,
      studentEnrollments: 1,
      studentNumber: 1,
      systemId: 1,
      created: 1,
      modified: 1,
      source: 1
    }

    const student = await studentsCollection.findOne({ _id: new ObjectId(studentId) }, { projection })
    if (!student) {
      return null
    }
    logger.info("Student with _id {studentId} found: {feideName}", studentId, student.feideName)

    return {
      _id: student._id.toString(),
      feideName: student.feideName,
      name: student.name,
      studentEnrollments: student.studentEnrollments,
      studentNumber: student.studentNumber,
      systemId: student.systemId,
      created: student.created,
      modified: student.modified,
      source: student.source
    }
  }

  async getStudentDocuments(studentId: string): Promise<Document[]> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbDocument>(this.documentsCollectionName)

    type DocumentWithCreator = DbDocument & {
      tyler_the_creator?: {
        entra: {
          displayName: string
        }
      }[]
    }

    const documents = await documentsCollection
      .aggregate<DocumentWithCreator>([
        {
          $match: {
            "student._id": new ObjectId(studentId)
          }
        },
        {
          $lookup: {
            from: this.usersCollectionName,
            localField: "created.by.entraUserId",
            foreignField: "entra.id",
            as: "tyler_the_creator",
            pipeline: [
              {
                $project: {
                  "entra.displayName": 1
                }
              }
            ]
          }
        }
      ])
      .toArray()

    // Todo: Add projection to only include necessary fields - And authorization

    // Sleep 5 seconds to simulate long-running operation and test streaming
    // await new Promise((resolve) => setTimeout(resolve, 2500))

    return documents
      .map((document: DocumentWithCreator): Document => {
        const createdByDisplayName = document.tyler_the_creator && document.tyler_the_creator.length > 0 ? document.tyler_the_creator[0].entra.displayName : undefined
        delete document.tyler_the_creator

        const studentDocument: Document = {
          ...document,
          student: document.student ? { _id: document.student._id.toString() } : undefined,
          _id: document._id.toString()
        }
        if (createdByDisplayName) {
          studentDocument.created.by.displayName = createdByDisplayName
        }
        return studentDocument
      })
      .sort((a, b) => new Date(b.created.at).getTime() - new Date(a.created.at).getTime()) // Sort by created date descending
  }

  async getDocumentById(documentId: string): Promise<Document | null> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbDocument>(this.documentsCollectionName)

    const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) })

    if (!document) {
      return null
    }

    return {
      ...document,
      student: document.student ? { _id: document.student._id.toString() } : undefined,
      _id: document._id.toString()
    }
  }

  async createDocument(document: NewDocument): Promise<string> {
    const db = await this.getDb()
    const documentsCollection = db.collection<NewDbDocument>(this.documentsCollectionName)

    const documentToInsert: NewDbDocument = {
      ...document,
      student: document.student ? { _id: new ObjectId(document.student._id) } : undefined
    }

    const result = await documentsCollection.insertOne(documentToInsert)

    if (document.student?._id) {
      try {
        await this.updateStudentLastActivityTimestamp(document.student._id, document.school)
      } catch (error) {
        logger.errorException(
          error,
          "Failed to update student's latest activity timestamp after creating document. Document ID: {documentId}. OBS, returning document ID anyway",
          result.insertedId.toString()
        )
      }
    }

    return result.insertedId.toString()
  }

  async addDocumentMessage(documentId: string, message: NewDocumentMessage, studentId?: string): Promise<DocumentMessage> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbDocument>(this.documentsCollectionName)

    const messageWithId = {
      ...message,
      messageId: new ObjectId().toString()
    }

    const document = await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $push: { messages: messageWithId } })

    if (!document?._id) {
      throw new Error("Failed to add message to document")
    }

    // TODO - flytt denne ut, den hører ikke hjemme her - men der den blir påkalt fra
    if (studentId) {
      try {
        await this.updateStudentLastActivityTimestamp(studentId, document.school)
      } catch (error) {
        logger.errorException(error, "Failed to update student's latest activity timestamp after adding document message. Document ID: {documentId}. OBS, returning message anyway", documentId)
      }
    }

    return messageWithId
  }

  async getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>> {
    const db = await this.getDb()

    const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
    const importantStuffList = await importantStuffCollection.find({ "student._id": { $in: studentIds.map((id) => new ObjectId(id)) } }).toArray()

    /*
    - Skal hente important stuff for alle elever brukeren har tilgang på - og important stuff skal være knyttet til skolene brukeren har tilgang på.
    - Hvis vi har liste med

    */

    return importantStuffList.reduce((acc: Record<string, Record<string, StudentImportantStuff>>, importantStuff: DbStudentImportantStuff) => {
      const studentId = importantStuff.student._id.toString()
      const schoolNumber = importantStuff.school.schoolNumber
      acc[studentId] = {
        ...acc[studentId],
        [schoolNumber]: {
          ...importantStuff,
          _id: importantStuff._id.toString(),
          student: {
            _id: studentId
          }
        }
      }
      return acc
    }, {})
  }

  async getStudentImportantStuff(studentId: string, schoolNumber: string): Promise<StudentImportantStuff | null> {
    const db = await this.getDb()

    const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
    logger.info("Getting important stuff for student with _id {studentId} and schoolNumber {schoolNumber}", studentId, schoolNumber)

    const importantStuffForStudent = await importantStuffCollection.findOne({ "student._id": new ObjectId(studentId), "school.schoolNumber": schoolNumber })
    logger.info("Important stuff for student with _id {studentId} exists: {importantStuffExists}", studentId, importantStuffForStudent !== null)

    if (!importantStuffForStudent) {
      return null
    }

    return {
      ...importantStuffForStudent,
      _id: importantStuffForStudent._id.toString(),
      student: {
        _id: importantStuffForStudent.student._id.toString()
      }
    }
  }

  async upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<string> {
    const db = await this.getDb()
    const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)

    const result = await importantStuffCollection.findOneAndUpdate(
      { "student._id": new ObjectId(studentId) },
      {
        $set: {
          ...importantStuff,
          student: {
            _id: new ObjectId(studentId)
          }
        }
      },
      { upsert: true, returnDocument: "after" }
    )

    if (!result?._id) {
      throw new Error("Failed to upsert student important stuff")
    }

    return result._id.toString()
  }

  async updateStudentLastActivityTimestamp(studentId: string, school: SchoolInfo): Promise<string> {
    const db = await this.getDb()
    const importantStuffCollection = db.collection<NewDbStudentImportantStuff>(this.importantStuffCollectionName)

    const existingImportantStuff = await importantStuffCollection.findOne({ "student._id": new ObjectId(studentId), "school.schoolNumber": school.schoolNumber })

    if (!existingImportantStuff) {
      const editor: EditorData = {
        at: new Date(),
        by: {
          entraUserId: "SYSTEM",
          fallbackName: "SYSTEM"
        }
      }
      const newImportantStuff: NewStudentImportantStuff = {
        type: "STUDENT",
        created: editor,
        school,
        modified: editor,
        facilitation: [],
        followUp: [],
        importantInfo: "",
        lastActivityTimestamp: new Date()
      }

      const result = await importantStuffCollection.insertOne({
        ...newImportantStuff,
        student: {
          _id: new ObjectId(studentId)
        }
      })

      if (!result.insertedId) {
        throw new Error("Failed to insert new student important stuff")
      }

      return result.insertedId.toString()
    }

    const result = await importantStuffCollection.updateOne(
      { "student._id": new ObjectId(studentId), "school.schoolNumber": school.schoolNumber },
      {
        $set: {
          lastActivityTimestamp: new Date()
        }
      }
    )

    if (!result.modifiedCount) {
      throw new Error("Failed to update student's latest activity timestamp")
    }

    return existingImportantStuff._id.toString()
  }

  async getDocumentContentTemplates(availableFor?: AvailableForDocumentType): Promise<DocumentContentTemplate[]> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const query = availableFor ? { "availableForDocumentType.student": availableFor.student, "availableForDocumentType.group": availableFor.group } : {}

    const templates = await documentContentTemplatesCollection.find(query).toArray()

    return templates.map((template) => ({
      ...template,
      _id: template._id.toString()
    }))
  }

  async getDocumentContentTemplateById(templateId: string): Promise<DocumentContentTemplate | null> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const template = await documentContentTemplatesCollection.findOne({ _id: new ObjectId(templateId) })

    if (!template) {
      return null
    }

    return {
      ...template,
      _id: template._id.toString()
    }
  }

  async createDocumentContentTemplate(template: NewDocumentContentTemplate): Promise<string> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<NewDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const result = await documentContentTemplatesCollection.insertOne(template)
    return result.insertedId.toString()
  }

  async updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const result = await documentContentTemplatesCollection.updateOne({ _id: new ObjectId(templateId) }, { $set: { ...template } })

    if (result.modifiedCount === 0) {
      throw new Error("Failed to update document content template")
    }

    return templateId
  }

  async deleteDocumentContentTemplate(templateId: string): Promise<void> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const result = await documentContentTemplatesCollection.deleteOne({ _id: new ObjectId(templateId) })

    if (result.deletedCount === 0) {
      throw new Error("Failed to delete document content template")
    }
  }

  async getStudentDataSharingConsent(studentId: string): Promise<StudentDataSharingConsent | null> {
    const db = await this.getDb()
    const studentDataSharingConsentsCollection = db.collection<DbStudentDataSharingConsent>(this.studentDataSharingConsentsCollectionName)

    const consent = await studentDataSharingConsentsCollection.findOne({ "student._id": new ObjectId(studentId) })

    if (!consent) {
      return null
    }

    return {
      ...consent,
      _id: consent._id.toString(),
      student: {
        _id: consent.student._id.toString()
      }
    }
  }

  async getStudentsDataSharingConsent(studentIds: string[]): Promise<Record<string, StudentDataSharingConsent>> {
    const db = await this.getDb()
    const studentDataSharingConsentsCollection = db.collection<DbStudentDataSharingConsent>(this.studentDataSharingConsentsCollectionName)
    const consentsList = await studentDataSharingConsentsCollection.find({ "student._id": { $in: studentIds.map((id) => new ObjectId(id)) } }).toArray()

    return consentsList.reduce((acc: Record<string, StudentDataSharingConsent>, consent: DbStudentDataSharingConsent) => {
      const studentId = consent.student._id.toString()
      acc[studentId] = {
        ...consent,
        _id: consent._id.toString(),
        student: {
          _id: studentId
        }
      }
      return acc
    }, {})
  }

  async upsertStudentDataSharingConsent(studentId: string, consent: NewStudentDataSharingConsent): Promise<string> {
    const db = await this.getDb()
    const studentDataSharingConsentsCollection = db.collection<NewDbStudentDataSharingConsent>(this.studentDataSharingConsentsCollectionName)

    const updatedConsent: NewDbStudentDataSharingConsent = {
      ...consent,
      student: {
        _id: new ObjectId(studentId)
      }
    }

    const result = await studentDataSharingConsentsCollection.findOneAndUpdate({ "student._id": new ObjectId(studentId) }, { $set: updatedConsent }, { upsert: true, returnDocument: "after" })

    if (!result?._id) {
      throw new Error("Failed to upsert student data sharing consent")
    }

    return result._id.toString()
  }
}
