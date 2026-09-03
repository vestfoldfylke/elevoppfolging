import { logger } from "@vestfoldfylke/loglady"
import { type Binary, type Db, ObjectId } from "mongodb"
import type { IImportantStuffDbClient } from "$lib/types/db/db-client"
import type {
  DbEncryptedGroupImportantStuff,
  DbEncryptedStudentImportantStuff,
  DbGroupImportantStuff,
  DbStudentImportantStuff,
  EditorData,
  GroupImportantStuff,
  MetricCount,
  MetricLabel,
  NewDbStudentImportantStuff,
  NewGroupImportantStuff,
  NewStudentImportantStuff,
  SchoolInfo,
  StudentImportantStuff
} from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful } from "$lib/utils/metric-constants.js"
import { incrementCount } from "../../metrics/handle-metrics"

export class ImportantStuffDbClient implements IImportantStuffDbClient {
  private encryptionDb: Db
  private readonly encryptValue: (value: unknown) => Promise<Binary>
  private importantStuffCollectionName = "important-stuff"

  constructor(encryptionDb: Db, encryptValue: (value: unknown) => Promise<Binary>) {
    this.encryptionDb = encryptionDb
    this.encryptValue = encryptValue
  }

  async getStudentsImportantStuff(studentIds: string[]): Promise<Record<string, Record<string, StudentImportantStuff>>> {
    const importantStuffCollection = this.encryptionDb.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
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
    const importantStuffCollection = this.encryptionDb.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
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
    const importantStuffCollection = this.encryptionDb.collection<DbEncryptedStudentImportantStuff>(this.importantStuffCollectionName)

    const result: DbStudentImportantStuff | null = (await importantStuffCollection.findOneAndUpdate(
      { "student._id": new ObjectId(studentId), "school.schoolNumber": importantStuff.school.schoolNumber },
      {
        $set: {
          ...importantStuff,
          importantInfo: await this.encryptValue(importantStuff.importantInfo),
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
    const labels: MetricLabel[] = [
      ["schoolNumber", importantStuff.school.schoolNumber],
      ["schoolName", importantStuff.school.name]
    ]

    if (!result?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to upsert student important stuff")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return result._id.toString()
  }

  async updateStudentLastActivityTimestamp(studentId: string, school: SchoolInfo): Promise<string> {
    const importantStuffCollection = this.encryptionDb.collection<NewDbStudentImportantStuff>(this.importantStuffCollectionName)

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

  async getGroupImportantStuff(systemId: string): Promise<GroupImportantStuff[]> {
    const importantStuffCollection = this.encryptionDb.collection<DbGroupImportantStuff>(this.importantStuffCollectionName)
    logger.info("Getting important stuff for group with systemId {systemId}", systemId)

    const importantStuffForGroup = await importantStuffCollection.find({ "group.systemId": systemId }).toArray()
    logger.info("Important stuff for group with systemId {systemId} exists: {importantStuffExists}", systemId, importantStuffForGroup.length > 0)

    if (importantStuffForGroup.length === 0) {
      return []
    }

    return importantStuffForGroup.map((importantStuff) => ({
      ...importantStuff,
      _id: importantStuff._id.toString()
    }))
  }

  async upsertGroupImportantStuff(systemId: string, importantStuff: NewGroupImportantStuff): Promise<string> {
    const importantStuffCollection = this.encryptionDb.collection<DbEncryptedGroupImportantStuff>(this.importantStuffCollectionName)

    const result: DbGroupImportantStuff | null = (await importantStuffCollection.findOneAndUpdate(
      { "group.systemId": systemId },
      {
        $set: {
          ...importantStuff,
          importantInfo: await this.encryptValue(importantStuff.importantInfo),
          group: {
            systemId
          }
        }
      },
      { upsert: true, returnDocument: "after" }
    )) as DbGroupImportantStuff | null // Db client decrypts for us, so we can cast it to DbGroupImportantStuff

    const metricBody: MetricCount = {
      name: "GroupImportantStuff_Upsert",
      description: "Number of group important stuff upserted"
    }
    const labels: MetricLabel[] = [
      ["schoolNumber", importantStuff.school.schoolNumber],
      ["schoolName", importantStuff.school.name]
    ]

    if (!result?._id) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to upsert group important stuff")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return result._id.toString()
  }
}
