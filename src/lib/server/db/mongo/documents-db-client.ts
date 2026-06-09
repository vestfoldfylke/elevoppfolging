import { logger } from "@vestfoldfylke/loglady"
import { type Binary, type Db, type DeleteResult, type Filter, ObjectId } from "mongodb"
import { env } from "$env/dynamic/private"
import type { IDocumentsDbClient, StudentDocumentAccess } from "$lib/types/db/db-client"
import type {
  DbEncryptedDocumentMessage,
  DbEncryptedGroupDocument,
  DbEncryptedGroupDocumentUpdate,
  DbEncryptedStudentDocument,
  DbEncryptedStudentDocumentUpdate,
  DbGroupDocument,
  DbStudentDocument,
  GroupDocument,
  GroupDocumentUpdate,
  MetricCount,
  MetricLabel,
  NewDbEncryptedGroupDocument,
  NewDbEncryptedStudentDocument,
  NewDocumentMessage,
  NewGroupDocument,
  NewStudentDocument,
  StudentDocument,
  StudentDocumentUpdate
} from "$lib/types/db/shared-types"
import { incrementCount, metricResultFailure, metricResultName, metricResultSuccessful } from "../../metrics/handle-metrics"

const documentLockStart: string | undefined = env.DOCUMENT_LOCK_START_MM_DD
if (!documentLockStart) {
  logger.warn("DOCUMENT_LOCK_START_MM_DD environment variable is not set. Document locking is disabled.")
} else {
  logger.warn("Document locking is enabled. Documents will be locked at school year end, currently set to {DocumentLockStart} (MM-DD)", documentLockStart)
}

const CHUNK_SIZE = 5000

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function buildStudentAccessCondition({ studentId, schoolNumbers, subjectTeacherOnlySchoolNumbers, hasDataSharingConsent, principalEntraUserId }: StudentDocumentAccess): Filter<DbStudentDocument> {
  const id = new ObjectId(studentId)

  if (subjectTeacherOnlySchoolNumbers.length === 0) {
    if (hasDataSharingConsent) {
      return { "student._id": id }
    }
    return { "student._id": id, "school.schoolNumber": { $in: schoolNumbers } }
  }

  const subjectTeacherOnlySet = new Set(subjectTeacherOnlySchoolNumbers)
  const fullAccessSchools = schoolNumbers.filter((s) => !subjectTeacherOnlySet.has(s))

  // At subject-teacher-only schools: visible if access is granted to all, OR the principal created the document themselves
  const subjectTeacherClause: Filter<DbStudentDocument> = {
    "school.schoolNumber": { $in: subjectTeacherOnlySchoolNumbers },
    $or: [{ documentAccess: "ALL_WITH_STUDENT_ACCESS" }, { "created.by.entraUserId": principalEntraUserId }]
  }

  if (hasDataSharingConsent) {
    return {
      "student._id": id,
      $or: [{ "school.schoolNumber": { $nin: subjectTeacherOnlySchoolNumbers } }, subjectTeacherClause]
    }
  }

  const orClauses = fullAccessSchools.length > 0 ? [{ "school.schoolNumber": { $in: fullAccessSchools } }, subjectTeacherClause] : [subjectTeacherClause]

  return { "student._id": id, $or: orClauses }
}

export class DocumentsDbClient implements IDocumentsDbClient {
  private encryptionDb: Db
  private readonly encryptValue: (value: unknown) => Promise<Binary>
  private documentsCollectionName = "documents"
  private usersCollectionName = "users"

  constructor(encryptionDb: Db, encryptValue: (value: unknown) => Promise<Binary>) {
    this.encryptionDb = encryptionDb
    this.encryptValue = encryptValue
  }

  async getStudentDocuments(studentId: string): Promise<StudentDocument[]> {
    const documentsCollection = this.encryptionDb.collection<DbStudentDocument>(this.documentsCollectionName)

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
          template: { _id: document.template._id.toString(), name: document.template.name, version: document.template.version },
          _id: document._id.toString(),
          isDocumentLocked: this.isDocumentLocked(document.created.at)
        }
        if (createdByDisplayName) {
          studentDocument.created.by.displayName = createdByDisplayName
        }
        return studentDocument
      })
      .sort((a: StudentDocument, b: StudentDocument) => b.created.at.getTime() - a.created.at.getTime()) // Sort by created date descending
  }

  async getStudentIdsWithoutDocuments(studentAccess: StudentDocumentAccess[]): Promise<string[]> {
    if (studentAccess.length === 0) {
      return []
    }

    const documentsCollection = this.encryptionDb.collection<DbStudentDocument>(this.documentsCollectionName)

    const chunks = chunkArray(studentAccess, CHUNK_SIZE)
    const results = await Promise.all(chunks.map((chunk) => documentsCollection.distinct("student._id", { $or: chunk.map(buildStudentAccessCondition) })))

    const studentIdsWithDocuments = new Set(results.flat().map((id) => id.toString()))
    return studentAccess.filter(({ studentId }) => !studentIdsWithDocuments.has(studentId)).map(({ studentId }) => studentId)
  }

  async getStudentIdsWithDocumentForTemplates(studentAccess: StudentDocumentAccess[], templateIds: string[]): Promise<string[]> {
    if (studentAccess.length === 0) {
      return []
    }

    const documentsCollection = this.encryptionDb.collection<DbStudentDocument>(this.documentsCollectionName)

    const chunks = chunkArray(studentAccess, CHUNK_SIZE)

    const setsPerTemplate = await Promise.all(
      templateIds.map(async (templateId) => {
        const results = await Promise.all(
          chunks.map((chunk) =>
            documentsCollection.distinct("student._id", {
              "template._id": new ObjectId(templateId),
              $or: chunk.map(buildStudentAccessCondition)
            })
          )
        )
        return new Set(results.flat().map((id) => id.toString()))
      })
    )

    const [first, ...rest] = setsPerTemplate
    const intersection = rest.reduce((acc, set) => {
      for (const id of acc) {
        if (!set.has(id)) {
          acc.delete(id)
        }
      }
      return acc
    }, first)
    return [...(intersection ?? [])]
  }

  async getStudentDocumentById(documentId: string): Promise<StudentDocument | null> {
    const documentsCollection = this.encryptionDb.collection<DbStudentDocument>(this.documentsCollectionName)

    const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) })

    if (!document) {
      return null
    }

    return {
      ...document,
      student: { _id: document.student._id.toString() },
      template: { _id: document.template._id.toString(), name: document.template.name, version: document.template.version },
      _id: document._id.toString(),
      isDocumentLocked: this.isDocumentLocked(document.created.at)
    }
  }

  async createStudentDocument(document: NewStudentDocument): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<NewDbEncryptedStudentDocument>(this.documentsCollectionName)

    const documentToInsert: NewDbEncryptedStudentDocument = {
      ...document,
      student: { _id: new ObjectId(document.student._id) },
      content: await this.encryptValue(document.content),
      title: await this.encryptValue(document.title),
      template: {
        _id: new ObjectId(document.template._id),
        name: await this.encryptValue(document.template.name),
        version: document.template.version
      },
      messages: [] // Messages cannot be created along with the actual document. They are added later
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

    return result.insertedId.toString()
  }

  async updateStudentDocument(documentId: string, documentUpdate: StudentDocumentUpdate): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)

    const encryptedDocumentUpdate: DbEncryptedStudentDocumentUpdate = {
      ...documentUpdate,
      content: await this.encryptValue(documentUpdate.content),
      title: await this.encryptValue(documentUpdate.title),
      template: {
        _id: new ObjectId(documentUpdate.template._id),
        name: await this.encryptValue(documentUpdate.template.name),
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

    return updatedDocument._id.toString()
  }

  async deleteStudentDocument(document: StudentDocument): Promise<void> {
    const deleteResult: DeleteResult = await this.encryptionDb.collection<DbEncryptedStudentDocument>(this.documentsCollectionName).deleteOne({ _id: new ObjectId(document._id) })

    const metricBody: MetricCount = {
      name: "StudentDocument_Remove",
      description: "Number of student documents removed"
    }
    const labels: MetricLabel[] = [["schoolNumber", document.school.schoolNumber]]

    if (deleteResult.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error(`Failed to delete student document with id: ${document._id}`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })
  }

  async addStudentDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...message,
      content: await this.encryptValue(message.content),
      messageId: new ObjectId().toString()
    }

    const document = (await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $push: { messages: encryptedMessageWithId } })) as DbStudentDocument | null // Db client decrypts for us, so we can cast it to DbStudentDocument

    const metricBody: MetricCount = {
      name: "StudentDocumentMessage_Create",
      description: "Number of student document messages created"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to add message to student document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    return encryptedMessageWithId.messageId
  }

  async updateStudentDocumentMessage(documentId: string, messageId: string, messageUpdate: NewDocumentMessage): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedStudentDocument>(this.documentsCollectionName)

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...messageUpdate,
      content: await this.encryptValue(messageUpdate.content),
      messageId
    }

    const document = (await documentsCollection.findOneAndUpdate(
      { _id: new ObjectId(documentId), "messages.messageId": messageId },
      { $set: { "messages.$": encryptedMessageWithId } }
    )) as DbStudentDocument | null // Db client decrypts for us, so we can cast it to DbStudentDocument

    const metricBody: MetricCount = {
      name: "StudentDocumentMessage_Update",
      description: "Number of student document messages updated"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update message in student document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    return messageId
  }

  async getGroupDocuments(systemId: string): Promise<GroupDocument[]> {
    const documentsCollection = this.encryptionDb.collection<DbGroupDocument>(this.documentsCollectionName)

    type DocumentWithCreator = DbGroupDocument & {
      tyler_the_creator?: {
        entra: {
          displayName: string
        }
      }[]
    }

    const documents: DocumentWithCreator[] = await documentsCollection
      .aggregate<DocumentWithCreator>([
        {
          $match: {
            "group.systemId": systemId
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

    return documents
      .map((document: DocumentWithCreator): GroupDocument => {
        const createdByDisplayName: string | undefined = document.tyler_the_creator && document.tyler_the_creator.length > 0 ? document.tyler_the_creator[0].entra.displayName : undefined
        delete document.tyler_the_creator

        const groupDocument: GroupDocument = {
          created: document.created,
          modified: document.modified,
          school: document.school,
          title: document.title,
          template: { _id: document.template._id.toString(), name: document.template.name, version: document.template.version },
          content: document.content,
          documentAccess: document.documentAccess,
          emailAlertReceivers: document.emailAlertReceivers,
          messages: document.messages,
          group: document.group,
          _id: document._id.toString(),
          isDocumentLocked: this.isDocumentLocked(document.created.at)
        }

        if (createdByDisplayName) {
          groupDocument.created.by.displayName = createdByDisplayName
        }

        return groupDocument
      })
      .sort((a: GroupDocument, b: GroupDocument) => b.created.at.getTime() - a.created.at.getTime()) // Sort by created date descending
  }

  async getGroupDocumentById(documentId: string): Promise<GroupDocument | null> {
    const documentsCollection = this.encryptionDb.collection<DbGroupDocument>(this.documentsCollectionName)

    const document = await documentsCollection.findOne({ _id: new ObjectId(documentId) })

    if (!document) {
      return null
    }

    return {
      created: document.created,
      modified: document.modified,
      school: document.school,
      title: document.title,
      template: { _id: document.template._id.toString(), name: document.template.name, version: document.template.version },
      content: document.content,
      documentAccess: document.documentAccess,
      emailAlertReceivers: document.emailAlertReceivers,
      messages: document.messages,
      group: document.group,
      _id: document._id.toString(),
      isDocumentLocked: this.isDocumentLocked(document.created.at)
    }
  }

  async createGroupDocument(document: NewGroupDocument): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<NewDbEncryptedGroupDocument>(this.documentsCollectionName)

    const encryptedDocumentMessages: DbEncryptedDocumentMessage[] = []

    for (const message of document.messages) {
      const encryptedMessageContent = await this.encryptValue(message.content)
      encryptedDocumentMessages.push({
        ...message,
        content: encryptedMessageContent
      })
    }

    const documentToInsert: NewDbEncryptedGroupDocument = {
      ...document,
      content: await this.encryptValue(document.content),
      title: await this.encryptValue(document.title),
      template: {
        _id: new ObjectId(document.template._id),
        name: await this.encryptValue(document.template.name),
        version: document.template.version
      },
      messages: encryptedDocumentMessages
    }

    const result = await documentsCollection.insertOne(documentToInsert)

    const metricBody: MetricCount = {
      name: "GroupDocument_Create",
      description: "Number of group documents created"
    }
    const labels: MetricLabel[] = [["schoolNumber", document.school.schoolNumber]]

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to create group document")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    return result.insertedId.toString()
  }

  async updateGroupDocument(documentId: string, documentUpdate: GroupDocumentUpdate): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedGroupDocument>(this.documentsCollectionName)

    const encryptedDocumentUpdate: DbEncryptedGroupDocumentUpdate = {
      ...documentUpdate,
      content: await this.encryptValue(documentUpdate.content),
      title: await this.encryptValue(documentUpdate.title),
      template: {
        _id: new ObjectId(documentUpdate.template._id),
        name: await this.encryptValue(documentUpdate.template.name),
        version: documentUpdate.template.version
      }
    }

    const updatedDocument: DbGroupDocument | null = (await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $set: encryptedDocumentUpdate })) as DbGroupDocument | null // Db client decrypts for us, so we can cast it to DbGroupDocument

    const metricBody: MetricCount = {
      name: "GroupDocument_Update",
      description: "Number of group documents updated"
    }
    const labels: MetricLabel[] = [["schoolNumber", documentUpdate.school.schoolNumber]]

    if (!updatedDocument?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update group document")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })

    return updatedDocument._id.toString()
  }

  async deleteGroupDocument(document: GroupDocument): Promise<void> {
    const deleteResult: DeleteResult = await this.encryptionDb.collection<DbEncryptedGroupDocument>(this.documentsCollectionName).deleteOne({ _id: new ObjectId(document._id) })

    const metricBody: MetricCount = {
      name: "GroupDocument_Remove",
      description: "Number of group documents removed"
    }
    const labels: MetricLabel[] = [["schoolNumber", document.school.schoolNumber]]

    if (deleteResult.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricResultName, metricResultFailure]]
      })

      throw new Error(`Failed to delete group document with id: ${document._id}`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricResultName, metricResultSuccessful]]
    })
  }

  async addGroupDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedGroupDocument>(this.documentsCollectionName)

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...message,
      content: await this.encryptValue(message.content),
      messageId: new ObjectId().toString()
    }

    const document = (await documentsCollection.findOneAndUpdate({ _id: new ObjectId(documentId) }, { $push: { messages: encryptedMessageWithId } })) as DbGroupDocument | null // Db client decrypts for us, so we can cast it to DbGroupDocument

    const metricBody: MetricCount = {
      name: "GroupDocumentMessage_Create",
      description: "Number of group document messages created"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to add message to group document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    return encryptedMessageWithId.messageId
  }

  async updateGroupDocumentMessage(documentId: string, messageId: string, messageUpdate: NewDocumentMessage): Promise<string> {
    const documentsCollection = this.encryptionDb.collection<DbEncryptedGroupDocument>(this.documentsCollectionName)

    const encryptedMessageWithId: DbEncryptedDocumentMessage = {
      ...messageUpdate,
      content: await this.encryptValue(messageUpdate.content),
      messageId
    }

    const document = (await documentsCollection.findOneAndUpdate(
      { _id: new ObjectId(documentId), "messages.messageId": messageId },
      { $set: { "messages.$": encryptedMessageWithId } }
    )) as DbGroupDocument | null // Db client decrypts for us, so we can cast it to DbGroupDocument

    const metricBody: MetricCount = {
      name: "GroupDocumentMessage_Update",
      description: "Number of group document messages updated"
    }

    if (!document?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricResultName, metricResultFailure]]
      })

      throw new Error("Failed to update message in group document")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricResultName, metricResultSuccessful]]
    })

    return messageId
  }

  private isDocumentLocked = (documentCreatedAt: Date): boolean => {
    if (!documentLockStart) {
      return false
    }

    const dateNow: Date = new Date()
    const currentlyInFirstPartOfSchoolYear: boolean = dateNow.getMonth() >= 6 && dateNow.getMonth() <= 11
    const schoolStartYear: number = currentlyInFirstPartOfSchoolYear ? dateNow.getFullYear() : dateNow.getFullYear() - 1
    const schoolStartDate: Date = new Date(`${schoolStartYear}-${documentLockStart}`)
    const schoolEndYear: number = currentlyInFirstPartOfSchoolYear ? dateNow.getFullYear() + 1 : dateNow.getFullYear()
    const schoolEndDate: Date = new Date(`${schoolEndYear}-${documentLockStart}`)

    return !(documentCreatedAt >= schoolStartDate && documentCreatedAt <= schoolEndDate)
  }
}
