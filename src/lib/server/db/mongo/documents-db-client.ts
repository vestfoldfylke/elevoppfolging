import { type Binary, type Db, ObjectId } from "mongodb"
import type { IDocumentsDbClient } from "$lib/types/db/db-client"
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

export class DocumentsDbClient implements IDocumentsDbClient {
  private encryptionDb: Db
  private encryptValue: (value: unknown) => Promise<Binary>
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
          _id: document._id.toString()
        }
        if (createdByDisplayName) {
          studentDocument.created.by.displayName = createdByDisplayName
        }
        return studentDocument
      })
      .sort((a: StudentDocument, b: StudentDocument) => b.created.at.getTime() - a.created.at.getTime()) // Sort by created date descending
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
      _id: document._id.toString()
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
        _id: document.template._id,
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
        _id: documentUpdate.template._id,
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
          ...document,
          _id: document._id.toString()
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
      ...document,
      _id: document._id.toString()
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
        _id: document.template._id,
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
        _id: documentUpdate.template._id,
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
}
