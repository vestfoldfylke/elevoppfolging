import { type Binary, type Db, ObjectId } from "mongodb"
import type { IStudentCheckBoxDbClient } from "$lib/types/db/db-client"
import type { DbEncryptedStudentCheckBox, DbStudentCheckBox, MetricCount, MetricLabel, NewDbEncryptedStudentCheckBox, NewStudentCheckBox, StudentCheckBox } from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful } from "$lib/utils/metric-constants.js"
import { incrementCount } from "../../metrics/handle-metrics"

export class StudentCheckBoxDbClient implements IStudentCheckBoxDbClient {
  private encryptionDb: Db
  private readonly encryptValue: (value: unknown) => Promise<Binary>
  private studentCheckBoxesCollectionName = "student-checkboxes"

  constructor(encryptionDb: Db, encryptValue: (value: unknown) => Promise<Binary>) {
    this.encryptionDb = encryptionDb
    this.encryptValue = encryptValue
  }

  async getStudentCheckBoxes(): Promise<StudentCheckBox[]> {
    const studentCheckBoxesCollection = this.encryptionDb.collection<DbStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const checkBoxes = await studentCheckBoxesCollection.find().toArray()
    return checkBoxes.map((checkBox) => ({
      ...checkBox,
      _id: checkBox._id.toString()
    }))
  }

  async createStudentCheckBox(studentCheckBox: NewStudentCheckBox): Promise<string> {
    const studentCheckBoxesCollection = this.encryptionDb.collection<NewDbEncryptedStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const result = await studentCheckBoxesCollection.insertOne({
      ...studentCheckBox,
      value: await this.encryptValue(studentCheckBox.value)
    })

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Create",
      description: "Number of student checkboxes created"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to create student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return result.insertedId.toString()
  }

  async updateStudentCheckBox(studentCheckBoxId: string, studentCheckBox: NewStudentCheckBox): Promise<string> {
    const studentCheckBoxesCollection = this.encryptionDb.collection<DbEncryptedStudentCheckBox>(this.studentCheckBoxesCollectionName)

    const result = await studentCheckBoxesCollection.updateOne({ _id: new ObjectId(studentCheckBoxId) }, { $set: { ...studentCheckBox, value: await this.encryptValue(studentCheckBox.value) } })

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Update",
      description: "Number of student checkboxes updated"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (result.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to update student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return studentCheckBoxId
  }

  async deleteStudentCheckBox(studentCheckBox: StudentCheckBox): Promise<void> {
    const studentCheckBoxesCollection = this.encryptionDb.collection<DbStudentCheckBox>(this.studentCheckBoxesCollectionName)
    const result = await studentCheckBoxesCollection.deleteOne({ _id: new ObjectId(studentCheckBox._id) })

    const metricBody: MetricCount = {
      name: "StudentCheckBox_Remove",
      description: "Number of student checkboxes removed"
    }
    const labels: MetricLabel[] = [["type", studentCheckBox.type]]

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to delete student check box")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })
  }
}
