import { type Collection, type Db, ObjectId } from "mongodb"
import type { IStudentDataSharingConsentsDbClient } from "$lib/types/db/db-client"
import type { DbStudentDataSharingConsent, MetricCount, NewDbStudentDataSharingConsent, NewStudentDataSharingConsent, StudentDataSharingConsent } from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful } from "$lib/utils/metric-constants.js"
import { incrementCount } from "../../metrics/handle-metrics"

export class StudentDataSharingConsentsDbClient implements IStudentDataSharingConsentsDbClient {
  private studentDataSharingConsentsCollection: Collection<DbStudentDataSharingConsent>

  constructor(db: Db) {
    this.studentDataSharingConsentsCollection = db.collection<DbStudentDataSharingConsent>("student-data-sharing-consents")
  }

  async getStudentDataSharingConsent(studentId: string): Promise<StudentDataSharingConsent | null> {
    const consent = await this.studentDataSharingConsentsCollection.findOne({ "student._id": new ObjectId(studentId) })

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
    const consentsList = await this.studentDataSharingConsentsCollection.find({ "student._id": { $in: studentIds.map((id) => new ObjectId(id)) } }).toArray()

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
    const updatedConsent: NewDbStudentDataSharingConsent = {
      ...consent,
      student: {
        _id: new ObjectId(studentId)
      }
    }

    const result = await this.studentDataSharingConsentsCollection.findOneAndUpdate({ "student._id": new ObjectId(studentId) }, { $set: updatedConsent }, { upsert: true, returnDocument: "after" })

    const metricBody: MetricCount = {
      name: "StudentDataSharing_Upsert",
      description: "Number of student data sharing upserted"
    }

    if (!result?._id) {
      incrementCount({
        ...metricBody,
        labels: [[metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to upsert student data sharing consent")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricsResultName, metricsResultSuccessful]]
    })

    return result._id.toString()
  }
}
