import { logger } from "@vestfoldfylke/loglady"
import {
  ClientEncryption,
  type ClientEncryptionEncryptOptions,
  type Collection,
  type Db,
  type Filter,
  type InsertOneResult,
  MongoClient,
  ObjectId,
  type UpdateResult,
  type UUID,
  type WithId
} from "mongodb"
import { env } from "$env/dynamic/private"
import { incrementCount, metricResultFailure, metricResultName, metricResultSuccessful } from "$lib/server/metrics/handle-metrics"
import type { AccessEntry, FrontendStudent, StudentMemberships } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { KeysToNumber } from "$lib/types/db/db-helpers"
import type {
  Access,
  AppStudent,
  AppUser,
  AvailableForDocumentType,
  DbAccess,
  DbAppStudent,
  DbDocumentContentTemplate,
  DbEncryptedDocumentMessage,
  DbEncryptedStudentCheckBox,
  DbEncryptedStudentDocument,
  DbEncryptedStudentDocumentUpdate,
  DbEncryptedStudentImportantStuff,
  DbProgramArea,
  DbSchool,
  DbStudentCheckBox,
  DbStudentDataSharingConsent,
  DbStudentDocument,
  DbStudentImportantStuff,
  DocumentContentTemplate,
  EditorData,
  ManualAccessEntryInput,
  MetricCount,
  MetricLabel,
  NewAccess,
  NewAppStudent,
  NewDbEncryptedStudentCheckBox,
  NewDbEncryptedStudentDocument,
  NewDbStudentDataSharingConsent,
  NewDbStudentImportantStuff,
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
  StudentEnrollment,
  StudentImportantStuff,
  UpdateAppStudent
} from "$lib/types/db/shared-types"
import { APP_INFO } from "../app-info"

type DbEncryptionClient = {
  client: ClientEncryption
  encryptionOptions: ClientEncryptionEncryptOptions
}

export class MongoDbClient implements IDbClient {
  private readonly mongoClient: MongoClient
  private db: Db | null = null
  private encryptionClient: ClientEncryption | null = null
  private encryptionKeyIds: UUID[] = []
  private readonly keyVaultNamespace
  private readonly kmsProviders: { azure: { tenantId: string; clientId: string; clientSecret: string } }
  private readonly schoolsCollectionName = "schools"
  private readonly accessCollectionName = "access"
  private readonly studentsCollectionName = "students"
  private readonly usersCollectionName = "users"
  private readonly importantStuffCollectionName = "important-stuff"
  private readonly programAreasCollectionName = "program-areas"
  private readonly documentsCollectionName = "documents"
  private readonly documentContentTemplatesCollectionName = "document-content-templates"
  private readonly studentDataSharingConsentsCollectionName = "student-data-sharing-consents"
  private readonly studentCheckBoxesCollectionName = "student-checkboxes"

  constructor() {
    if (!env.MONGODB_CONNECTION_STRING) {
      throw new Error("MONGODB_CONNECTION_STRING is not set (du har glemt den)")
    }
    if (!env.MONGODB_DATABASE_NAME) {
      throw new Error("MONGODB_DATABASE_NAME is not set (du har glemt den)")
    }
    if (!env.AZURE_TENANT_ID || !env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) {
      throw new Error("Azure credentials for client-side encryption is not fully set (du har glemt en av AZURE_TENANT_ID, AZURE_CLIENT_ID eller AZURE_CLIENT_SECRET)")
    }

    this.keyVaultNamespace = `${env.MONGODB_DATABASE_NAME}.__keyVault`
    this.kmsProviders = {
      azure: {
        tenantId: env.AZURE_TENANT_ID,
        clientId: env.AZURE_CLIENT_ID,
        clientSecret: env.AZURE_CLIENT_SECRET
      }
    }

    this.mongoClient = new MongoClient(env.MONGODB_CONNECTION_STRING, {
      autoEncryption: {
        keyVaultNamespace: this.keyVaultNamespace,
        kmsProviders: this.kmsProviders,
        bypassAutoEncryption: true
      }
    })
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

  private async getEncryptionClient(): Promise<DbEncryptionClient> {
    const algorithm = "AEAD_AES_256_CBC_HMAC_SHA_512-Random"

    if (this.encryptionClient) {
      if (this.encryptionKeyIds.length === 0) {
        throw new Error("Encryption client is initialized but no encryption keys found in the key vault collection")
      }

      return {
        client: this.encryptionClient,
        encryptionOptions: {
          // Random id
          keyId: this.encryptionKeyIds[Math.floor(Math.random() * this.encryptionKeyIds.length)],
          algorithm
        }
      }
    }

    // Must ensure connect
    await this.getDb()

    try {
      this.encryptionClient = new ClientEncryption(this.mongoClient, {
        keyVaultNamespace: this.keyVaultNamespace,
        kmsProviders: this.kmsProviders
      })

      this.encryptionKeyIds = (await this.encryptionClient.getKeys().toArray()).map((key) => key._id)
    } catch (error) {
      logger.errorException(error, "Error when initializing encryption client")
      throw error
    }

    if (this.encryptionKeyIds.length === 0) {
      logger.error("No encryption keys found in the key vault collection")
      throw new Error("No encryption keys found in the key vault collection")
    }

    return {
      client: this.encryptionClient,
      encryptionOptions: {
        // Random id
        keyId: this.encryptionKeyIds[Math.floor(Math.random() * this.encryptionKeyIds.length)],
        algorithm
      }
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

    const metricBody: MetricCount = {
      name: "School_Create",
      description: "Number of schools created"
    }

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create school")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string> {
    const db = await this.getDb()
    const schoolsCollection = db.collection<DbSchool>(this.schoolsCollectionName)
    const result = await schoolsCollection.updateOne({ schoolNumber }, { $set: schoolData })

    const metricBody: MetricCount = {
      name: "School_Update",
      description: "Number of schools updated"
    }

    if (result.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error(`School with schoolNumber: ${schoolNumber} not found`)
    }

    if (result.modifiedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error(`Failed to update school with schoolNumber: ${schoolNumber}`)
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return schoolNumber
  }

  async deleteSchool(schoolNumber: string): Promise<void> {
    const db = await this.getDb()
    const schoolsCollection = db.collection<DbSchool>(this.schoolsCollectionName)
    const result = await schoolsCollection.deleteOne({ schoolNumber })

    const metricBody: MetricCount = {
      name: "School_Remove",
      description: "Number of schools removed"
    }

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error(`Failed to delete school with schoolNumber: ${schoolNumber}`)
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation
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
      programAreas: access.programAreas.map((programAreaAccessEntry) => ({
        ...programAreaAccessEntry,
        _id: programAreaAccessEntry._id.toString()
      })),
      students: access.students.map((studentAccessEntry) => ({
        ...studentAccessEntry,
        _id: studentAccessEntry._id.toString()
      })),
      _id: access._id.toString()
    }
  }

  async getSchoolLeaderAccess(): Promise<Access[]> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    const accessList = await accessCollection.find({ leaderForSchools: { $exists: true, $ne: [] } }).toArray()
    return accessList.map((access) => {
      return {
        ...access,
        programAreas: access.programAreas.map((programAreaAccessEntry) => ({
          ...programAreaAccessEntry,
          _id: programAreaAccessEntry._id.toString()
        })),
        students: access.students.map((studentAccessEntry) => ({
          ...studentAccessEntry,
          _id: studentAccessEntry._id.toString()
        })),
        _id: access._id.toString()
      }
    })
  }

  async createAccess(access: NewAccess): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<NewAccess>(this.accessCollectionName)
    const result = await accessCollection.insertOne(access)

    const metricBody: MetricCount = {
      name: "Access_Create",
      description: "Number of access created"
    }

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create access")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async addAccessEntry(entraUserId: string, accessEntry: AccessEntry): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    let updateResult: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { leaderForSchools: accessEntry } })
        break
      case "MANUELL-ELEV-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { students: { ...accessEntry, _id: new ObjectId(accessEntry._id) } } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { classes: accessEntry } })
        break
      case "MANUELL-PROGRAMOMRÅDE-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { programAreas: { ...accessEntry, _id: new ObjectId(accessEntry._id) } } })
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        updateResult = await accessCollection.findOneAndUpdate({ entraUserId }, { $push: { manageManualStudentsForSchools: accessEntry } })
        break
      default:
        throw new Error(`Invalid access entry type: ${accessEntry.type}`)
    }

    const metricBody: MetricCount = {
      name: "AccessEntry_Create",
      description: "Number of access entries created",
      splitMetricByLabels: true
    }
    const labels: MetricLabel[] = [
      ["schoolNumber", accessEntry.schoolNumber],
      ["type", accessEntry.type]
    ]

    if (!updateResult?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to add access entry")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return updateResult._id.toString()
  }

  async removeAccessEntry(entraUserId: string, accessEntry: ManualAccessEntryInput): Promise<string> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    let updatedAccess: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { leaderForSchools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { manageManualStudentsForSchools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-ELEV-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { students: { _id: new ObjectId(accessEntry._id), schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { classes: { systemId: accessEntry.systemId, schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-PROGRAMOMRÅDE-TILGANG":
        updatedAccess = await accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { programAreas: { _id: new ObjectId(accessEntry._id), schoolNumber: accessEntry.schoolNumber } } })
        break
    }

    const metricBody: MetricCount = {
      name: "AccessEntry_Remove",
      description: "Number of access entries removed",
      splitMetricByLabels: true
    }
    const labels: MetricLabel[] = [
      ["schoolNumber", accessEntry.schoolNumber],
      ["type", accessEntry.type]
    ]

    if (!updatedAccess?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to remove access entry")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return updatedAccess._id.toString()
  }

  async getManualAccess(schoolNumber: string): Promise<Access[]> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
    const accessList = await accessCollection
      .find({
        $or: [
          {
            manageManualStudentsForSchools: { $exists: true, $ne: [], $elemMatch: { schoolNumber } }
          },
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
        leaderForSchools: [],
        manageManualStudentsForSchools: access.manageManualStudentsForSchools.filter((manageManualStudentAccessEntry) => manageManualStudentAccessEntry.schoolNumber === schoolNumber),
        programAreas: access.programAreas
          .filter((programArea) => programArea.schoolNumber === schoolNumber)
          .map((programArea) => ({
            ...programArea,
            _id: programArea._id.toString()
          })),
        classes: access.classes.filter((classAccess) => classAccess.type === "MANUELL-KLASSE-TILGANG" && classAccess.schoolNumber === schoolNumber),
        students: access.students
          .filter((studentAccess) => studentAccess.schoolNumber === schoolNumber)
          .map((studentAccess) => ({
            ...studentAccess,
            _id: studentAccess._id.toString()
          })),
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

  async getProgramAreasFromClassIds(classSystemIds: string[]): Promise<ProgramArea[]> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<DbProgramArea>(this.programAreasCollectionName)
    const programAreas = await programAreasCollection.find({ "classes.systemId": { $in: classSystemIds } }).toArray()

    return programAreas.map((programArea) => ({
      ...programArea,
      _id: programArea._id.toString()
    }))
  }

  async getProgramAreasForSchool(schoolNumber: string): Promise<ProgramArea[]> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<DbProgramArea>(this.programAreasCollectionName)
    const programAreas = await programAreasCollection.find({ schoolNumber }).toArray()

    return programAreas.map((programArea) => ({
      ...programArea,
      _id: programArea._id.toString()
    }))
  }

  async createProgramArea(programArea: NewProgramArea): Promise<string> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<NewProgramArea>(this.programAreasCollectionName)
    const result = await programAreasCollection.insertOne(programArea)

    const metricBody: MetricCount = {
      name: "ProgramArea_Create",
      description: "Number of program areas created"
    }
    const labels: MetricLabel[] = [["schoolNumber", programArea.schoolNumber]]

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create program area")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateProgramArea(programAreaId: string, programArea: NewProgramArea): Promise<string> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<DbProgramArea>(this.programAreasCollectionName)
    const updateResult = await programAreasCollection.updateOne({ _id: new ObjectId(programAreaId) }, { $set: programArea })

    const metricBody: MetricCount = {
      name: "ProgramArea_Update",
      description: "Number of program areas updated"
    }
    const labels: MetricLabel[] = [["schoolNumber", programArea.schoolNumber]]

    if (updateResult.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error(`Program area with id: ${programAreaId} not found, cannot update when it does not exist...`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return programAreaId
  }

  async deleteProgramArea(programArea: ProgramArea): Promise<void> {
    const db = await this.getDb()
    const programAreasCollection = db.collection<DbProgramArea>(this.programAreasCollectionName)
    const deleteResult = await programAreasCollection.deleteOne({ _id: new ObjectId(programArea._id) })

    const metricBody: MetricCount = {
      name: "ProgramArea_Remove",
      description: "Number of program areas removed"
    }
    const labels: MetricLabel[] = [["schoolNumber", programArea.schoolNumber]]

    if (deleteResult.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error(`Failed to delete program area with id: ${programArea._id}`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation
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
      studentEnrollments: 1
    }

    const endDateMustBeAfter = new Date()
    endDateMustBeAfter.setDate(endDateMustBeAfter.getDate() - APP_INFO.STUDENT_ACCESS_AFTER_EXPIRE_DAYS)

    // Get all students that has an enrollment with end date after the today minus STUDENT_ACCESS_AFTER_EXPIRE_DAYS, or no end date at all (active enrollments)
    const students = await studentsCollection
      .find<FrontendStudent>({ $or: [{ "studentEnrollments.period.end": { $eq: null } }, { "studentEnrollments.period.end": { $gte: endDateMustBeAfter } }] }, { projection })
      .toArray()

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

    for (const schoolAccessEntry of access.leaderForSchools) {
      query.$or.push({ "studentEnrollments.school.schoolNumber": schoolAccessEntry.schoolNumber })
    }

    const accessEntryNotInSchoolsAccess = (accessEntry: AccessEntry): boolean => {
      return !access.leaderForSchools.some((school) => school.schoolNumber === accessEntry.schoolNumber)
    }

    const studentAccessEntries = access.students.filter(accessEntryNotInSchoolsAccess)
    const programAreaAccessEntries = access.programAreas.filter(accessEntryNotInSchoolsAccess)
    const contactTeacherGroupAccessEntries = access.contactTeacherGroups.filter(accessEntryNotInSchoolsAccess)
    const classAccessEntries = access.classes.filter(accessEntryNotInSchoolsAccess)
    const teachingGroupAccessEntries = access.teachingGroups.filter(accessEntryNotInSchoolsAccess)

    const schoolsToAddToQuery = [
      ...new Set<string>([
        ...programAreaAccessEntries.map((programArea) => programArea.schoolNumber),
        ...studentAccessEntries.map((student) => student.schoolNumber),
        ...classAccessEntries.map((classAccess) => classAccess.schoolNumber),
        ...contactTeacherGroupAccessEntries.map((contactTeacherGroupAccess) => contactTeacherGroupAccess.schoolNumber),
        ...teachingGroupAccessEntries.map((teachingGroupAccess) => teachingGroupAccess.schoolNumber)
      ])
    ]

    // Expand programareas right here, and cache it (add them to classSystemIds) - get it from function that has caching (or get them once somewhere else and pass them in)

    for (const schoolNumber of schoolsToAddToQuery) {
      const schoolQuery: Filter<DbAppStudent> = { "studentEnrollments.school.schoolNumber": schoolNumber, $or: [] }

      const studentIds = studentAccessEntries.filter((studentAccess) => studentAccess.schoolNumber === schoolNumber).map((studentAccess) => studentAccess._id)
      if (studentIds.length > 0) {
        schoolQuery.$or?.push({ _id: { $in: studentIds.map((id) => new ObjectId(id)) } })
      }

      const contactTeacherGroupSystemIds = contactTeacherGroupAccessEntries
        .filter((contactTeacherGroupAccess) => contactTeacherGroupAccess.schoolNumber === schoolNumber)
        .map((contactTeacherGroupAccess) => contactTeacherGroupAccess.systemId)
      if (contactTeacherGroupSystemIds.length > 0) {
        schoolQuery.$or?.push({ "studentEnrollments.contactTeacherGroupMemberships.contactTeacherGroup.systemId": { $in: contactTeacherGroupSystemIds } })
      }

      const classSystemIds = classAccessEntries.filter((classAccess) => classAccess.schoolNumber === schoolNumber).map((classAccess) => classAccess.systemId)
      if (classSystemIds.length > 0) {
        schoolQuery.$or?.push({ "studentEnrollments.classMemberships.classGroup.systemId": { $in: classSystemIds } })
      }

      const teachingGroupSystemIds = teachingGroupAccessEntries
        .filter((teachingGroupAccess) => teachingGroupAccess.schoolNumber === schoolNumber)
        .map((teachingGroupAccess) => teachingGroupAccess.systemId)
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
      studentEnrollments: 1
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

  async getStudentBySsn(ssn: string): Promise<FrontendStudent | null> {
    const db: Db = await this.getDb()
    const studentsCollection: Collection<DbAppStudent> = db.collection<DbAppStudent>(this.studentsCollectionName)
    logger.info("Getting student by ssn")

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

    const student: WithId<DbAppStudent> | null = await studentsCollection.findOne({ ssn }, { projection })
    if (!student) {
      return null
    }

    logger.info("Student by ssn found. StudentId: {StudentId}", student._id.toString())

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

  async getStudentAccess(studentId: string, studentMemberships: StudentMemberships, studentProgramAreaIds: string[]): Promise<Access[]> {
    const db = await this.getDb()
    const accessCollection = db.collection<DbAccess>(this.accessCollectionName)

    const query: Filter<DbAccess> = {
      $or: [
        { "leaderForSchools.schoolNumber": { $in: studentMemberships.schoolNumbers } },
        { "classes.systemId": { $in: studentMemberships.classes.map((c) => c.systemId) } },
        { "programAreas._id": { $in: studentProgramAreaIds.map((id) => new ObjectId(id)) } },
        {
          "contactTeacherGroups.systemId": { $in: studentMemberships.contactTeacherGroups.map((c) => c.systemId) }
        },
        {
          "teachingGroups.systemId": { $in: studentMemberships.teachingGroups.map((c) => c.systemId) }
        },
        { "students._id": new ObjectId(studentId) }
      ]
    }

    const accessList = await accessCollection.find(query).toArray()

    return accessList.map((access) => {
      return {
        ...access,
        _id: access._id.toString(),
        programAreas: access.programAreas.map((programAreaAccessEntry) => ({
          ...programAreaAccessEntry,
          _id: programAreaAccessEntry._id.toString()
        })),
        students: access.students.map((studentAccessEntry) => ({
          ...studentAccessEntry,
          _id: studentAccessEntry._id.toString()
        }))
      }
    })
  }

  async getManualStudentById(studentId: string): Promise<AppStudent | null> {
    const db: Db = await this.getDb()
    const studentsCollection: Collection<DbAppStudent> = db.collection<DbAppStudent>(this.studentsCollectionName)
    logger.info("Getting manual student by id")

    const projection: KeysToNumber<WithId<AppStudent>> = {
      _id: 1,
      feideName: 1,
      name: 1,
      ssn: 1,
      studentEnrollments: 1,
      studentNumber: 1,
      systemId: 1,
      created: 1,
      modified: 1,
      source: 1
    }

    const student: WithId<DbAppStudent> | null = await studentsCollection.findOne({ _id: new ObjectId(studentId), source: "MANUAL" }, { projection })
    if (!student) {
      return null
    }

    logger.info("Manual student by id found. StudentId: {StudentId}", student._id.toString())

    return {
      _id: student._id.toString(),
      feideName: student.feideName,
      name: student.name,
      ssn: student.ssn,
      studentEnrollments: student.studentEnrollments,
      studentNumber: student.studentNumber,
      systemId: student.systemId,
      created: student.created,
      modified: student.modified,
      source: student.source
    }
  }

  async createManualStudent(manualStudent: NewAppStudent): Promise<string> {
    const db: Db = await this.getDb()
    const studentsCollection: Collection<NewAppStudent> = db.collection<NewAppStudent>(this.studentsCollectionName)
    logger.info("Creating new manual student with systemId: {SystemId}", manualStudent.systemId)

    const result: InsertOneResult<DbAppStudent> = await studentsCollection.insertOne(manualStudent)

    const mainSchoolNumber: string | undefined = manualStudent.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school.schoolNumber
    const metricBody: MetricCount = {
      name: "ManualStudent_Create",
      description: "Number of manual students created"
    }
    const labels: MetricLabel[] = []

    if (mainSchoolNumber) {
      labels.push(["schoolNumber", mainSchoolNumber])
    }

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to insert manual student")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateManualStudent(manualStudent: UpdateAppStudent): Promise<string> {
    const db: Db = await this.getDb()
    const studentsCollection: Collection<DbAppStudent> = db.collection<DbAppStudent>(this.studentsCollectionName)
    logger.info("Updating manual student with Id: {Id}", manualStudent._id)

    const manualStudentWithId: DbAppStudent = {
      ...manualStudent,
      _id: new ObjectId(manualStudent._id)
    }

    const result: UpdateResult<DbAppStudent> = await studentsCollection.updateOne({ _id: new ObjectId(manualStudent._id) }, { $set: manualStudentWithId })

    const mainSchoolNumber: string | undefined = manualStudent.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school.schoolNumber
    const metricBody: MetricCount = {
      name: "ManualStudent_Update",
      description: "Number of manual students updated"
    }
    const labels: MetricLabel[] = []

    if (mainSchoolNumber) {
      labels.push(["schoolNumber", mainSchoolNumber])
    }

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update manual student")
    }

    if (result.modifiedCount !== 1) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update manual student")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    logger.info("Manual student with Id {Id} updated", manualStudent._id)
    return manualStudent._id
  }

  async getStudentDocuments(studentId: string): Promise<StudentDocument[]> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbStudentDocument>(this.documentsCollectionName)

    type DocumentWithCreator = DbStudentDocument & {
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
      .map((document: DocumentWithCreator): StudentDocument => {
        const createdByDisplayName = document.tyler_the_creator && document.tyler_the_creator.length > 0 ? document.tyler_the_creator[0].entra.displayName : undefined
        delete document.tyler_the_creator

        const studentDocument: StudentDocument = {
          ...document,
          student: { _id: document.student._id.toString() },
          _id: document._id.toString()
        }
        if (createdByDisplayName) {
          studentDocument.created.by.displayName = createdByDisplayName
        }
        return studentDocument
      })
      .sort((a, b) => new Date(b.created.at).getTime() - new Date(a.created.at).getTime()) // Sort by created date descending
  }

  async getStudentDocumentById(documentId: string): Promise<StudentDocument | null> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbStudentDocument>(this.documentsCollectionName)

    const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) })

    if (!document) {
      return null
    }

    return {
      ...document,
      student: { _id: document.student._id.toString() },
      _id: document._id.toString()
    }
  }

  async createStudentDocument(document: NewStudentDocument): Promise<string> {
    const db = await this.getDb()
    const documentsCollection = db.collection<NewDbEncryptedStudentDocument>(this.documentsCollectionName)

    const encryption = await this.getEncryptionClient()

    const encryptedDocumentMessages: DbEncryptedDocumentMessage[] = []

    for (const message of document.messages) {
      const encryptedMessageContent = await encryption.client.encrypt(message.content, encryption.encryptionOptions)
      encryptedDocumentMessages.push({
        ...message,
        content: encryptedMessageContent
      })
    }

    const documentToInsert: NewDbEncryptedStudentDocument = {
      ...document,
      student: { _id: new ObjectId(document.student._id) },
      content: await encryption.client.encrypt(document.content, encryption.encryptionOptions),
      title: await encryption.client.encrypt(document.title, encryption.encryptionOptions),
      template: {
        _id: document.template._id,
        name: await encryption.client.encrypt(document.template.name, encryption.encryptionOptions),
        version: document.template.version
      },
      messages: encryptedDocumentMessages
    }

    const result = await documentsCollection.insertOne(documentToInsert)

    const metricBody: MetricCount = {
      name: "StudentDocument_Create",
      description: "Number of student documents created"
    }
    const labels: MetricLabel[] = [["schoolNumber", document.school.schoolNumber]]

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create student document")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateStudentDocument(documentId: string, documentUpdate: StudentDocumentUpdate): Promise<string> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)
    const encryption = await this.getEncryptionClient()

    const encryptedDocumentUpdate: DbEncryptedStudentDocumentUpdate = {
      ...documentUpdate,
      content: await encryption.client.encrypt(documentUpdate.content, encryption.encryptionOptions),
      title: await encryption.client.encrypt(documentUpdate.title, encryption.encryptionOptions),
      template: {
        _id: documentUpdate.template._id,
        name: await encryption.client.encrypt(documentUpdate.template.name, encryption.encryptionOptions),
        version: documentUpdate.template.version
      }
    }

    const updatedDocument: DbStudentDocument | null = (await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $set: encryptedDocumentUpdate })) as DbStudentDocument | null // Db client decrypts for us, so we can cast it to DbStudentDocument

    const metricBody: MetricCount = {
      name: "StudentDocument_Update",
      description: "Number of student documents updated"
    }
    const labels: MetricLabel[] = [["schoolNumber", documentUpdate.school.schoolNumber]]

    if (!updatedDocument?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update student document")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return updatedDocument._id.toString()
  }

  async addDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)
    const encryption = await this.getEncryptionClient()

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...message,
      content: await encryption.client.encrypt(message.content, encryption.encryptionOptions),
      messageId: new ObjectId().toString()
    }

    const document = (await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $push: { messages: encryptedMessageWithId } })) as DbStudentDocument | null // Db client decrypts for us, so we can cast it to DbStudentDocument

    const metricBody: MetricCount = {
      name: "StudentDocumentMessage_Create",
      description: "Number of document messages created"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to add message to document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return encryptedMessageWithId.messageId
  }

  async updateDocumentMessage(documentId: string, messageId: string, messageUpdate: NewDocumentMessage): Promise<string> {
    const db = await this.getDb()
    const documentsCollection = db.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)
    const encryption = await this.getEncryptionClient()

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...messageUpdate,
      content: await encryption.client.encrypt(messageUpdate.content, encryption.encryptionOptions),
      messageId
    }

    const document = (await documentsCollection.findOneAndUpdate(
      { _id: new ObjectId(documentId), "messages.messageId": messageId },
      { $set: { "messages.$": encryptedMessageWithId } }
    )) as DbStudentDocument | null // Db client decrypts for us, so we can cast it to DbStudentDocument

    const metricBody: MetricCount = {
      name: "StudentDocumentMessage_Update",
      description: "Number of document messages updated"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update message in document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return messageId
  }

  async getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>> {
    const db = await this.getDb()

    const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
    const importantStuffList = await importantStuffCollection.find({ "student._id": { $in: studentIds.map((id) => new ObjectId(id)) } }).toArray()

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

  async getStudentImportantStuff(studentId: string, schoolNumbers: string[]): Promise<StudentImportantStuff[]> {
    const db = await this.getDb()

    const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
    logger.info("Getting important stuff for student with _id {studentId} and schoolNumbers {schoolNumbers}", studentId, schoolNumbers.join(", "))

    const importantStuffForStudent = await importantStuffCollection.find({ "student._id": new ObjectId(studentId), "school.schoolNumber": { $in: schoolNumbers } }).toArray()
    logger.info("Important stuff for student with _id {studentId} exists: {importantStuffExists}", studentId, importantStuffForStudent.length > 0)

    if (importantStuffForStudent.length === 0) {
      return []
    }

    return importantStuffForStudent.map((importantStuff) => ({
      ...importantStuff,
      _id: importantStuff._id.toString(),
      student: {
        _id: importantStuff.student._id.toString()
      }
    }))
  }

  async upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<string> {
    const db = await this.getDb()
    const importantStuffCollection = db.collection<DbEncryptedStudentImportantStuff>(this.importantStuffCollectionName)
    const encryption = await this.getEncryptionClient()

    const result: DbStudentImportantStuff | null = (await importantStuffCollection.findOneAndUpdate(
      { "student._id": new ObjectId(studentId), "school.schoolNumber": importantStuff.school.schoolNumber },
      {
        $set: {
          ...importantStuff,
          importantInfo: await encryption.client.encrypt(importantStuff.importantInfo, encryption.encryptionOptions),
          student: {
            _id: new ObjectId(studentId)
          }
        }
      },
      { upsert: true, returnDocument: "after" }
    )) as DbStudentImportantStuff | null // Db client decrypts for us, so we can cast it to DbStudentImportantStuff

    const metricBody: MetricCount = {
      name: "StudentImportantStuff_Upsert",
      description: "Number of student important stuff upserted"
    }
    const labels: MetricLabel[] = [["schoolNumber", importantStuff.school.schoolNumber]]

    if (!result?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to upsert student important stuff")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

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

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Create",
      description: "Number of document templates created",
      splitMetricByLabels: true,
      includeLabelsInSplit: false
    }
    const labels: MetricLabel[] = []

    if (template.availableForDocumentType.group) {
      labels.push(["availableForClasses", template.availableForDocumentType.group.toString()])
    }

    if (template.availableForDocumentType.student) {
      labels.push(["availableForStudents", template.availableForDocumentType.student.toString()])
    }

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create document template")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateDocumentContentTemplate(templateId: string, template: NewDocumentContentTemplate): Promise<string> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const result = await documentContentTemplatesCollection.updateOne({ _id: new ObjectId(templateId) }, { $set: { ...template } })

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Update",
      description: "Number of document templates updated",
      splitMetricByLabels: true,
      includeLabelsInSplit: false
    }
    const labels: MetricLabel[] = []

    if (template.availableForDocumentType.group) {
      labels.push(["availableForClasses", template.availableForDocumentType.group.toString()])
    }

    if (template.availableForDocumentType.student) {
      labels.push(["availableForStudents", template.availableForDocumentType.student.toString()])
    }

    if (result.modifiedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update document content template")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return templateId
  }

  async deleteDocumentContentTemplate(templateId: string): Promise<void> {
    const db = await this.getDb()
    const documentContentTemplatesCollection = db.collection<DbDocumentContentTemplate>(this.documentContentTemplatesCollectionName)

    const result = await documentContentTemplatesCollection.deleteOne({ _id: new ObjectId(templateId) })

    const metricBody: MetricCount = {
      name: "DocumentTemplate_Remove",
      description: "Number of document templates removed"
    }

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to delete document content template")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation
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

    const metricBody: MetricCount = {
      name: "StudentDataSharing_Upsert",
      description: "Number of student data sharing upserted"
    }

    if (!result?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to upsert student data sharing consent")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result._id.toString()
  }

  async getStudentCheckBoxes(): Promise<StudentCheckBox[]> {
    const db = await this.getDb()
    const studentCheckBoxesCollection = db.collection<DbStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const checkBoxes = await studentCheckBoxesCollection.find().toArray()
    return checkBoxes.map((checkBox) => ({
      ...checkBox,
      _id: checkBox._id.toString()
    }))
  }

  async createStudentCheckBox(studentCheckBox: NewStudentCheckBox): Promise<string> {
    const db = await this.getDb()
    const encryption = await this.getEncryptionClient()

    const studentCheckBoxesCollection = db.collection<NewDbEncryptedStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const result = await studentCheckBoxesCollection.insertOne({
      ...studentCheckBox,
      value: await encryption.client.encrypt(studentCheckBox.value, encryption.encryptionOptions)
    })

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Create",
      description: "Number of student checkboxes created"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return result.insertedId.toString()
  }

  async updateStudentCheckBox(studentCheckBoxId: string, studentCheckBox: NewStudentCheckBox): Promise<string> {
    const db = await this.getDb()
    const encryption = await this.getEncryptionClient()
    const studentCheckBoxesCollection = db.collection<DbEncryptedStudentCheckBox>(this.studentCheckBoxesCollectionName)

    const result = await studentCheckBoxesCollection.updateOne(
      { _id: new ObjectId(studentCheckBoxId) },
      { $set: { ...studentCheckBox, value: await encryption.client.encrypt(studentCheckBox.value, encryption.encryptionOptions) } }
    )

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Update",
      description: "Number of student checkboxes updated"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (result.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation

    return studentCheckBoxId
  }

  async deleteStudentCheckBox(studentCheckBox: StudentCheckBox): Promise<void> {
    const db = await this.getDb()
    const studentCheckBoxesCollection = db.collection<DbStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const result = await studentCheckBoxesCollection.deleteOne({ _id: new ObjectId(studentCheckBox._id) })

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Remove",
      description: "Number of student checkboxes removed"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to delete student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    // TODO: audit-implementation
  }
}
