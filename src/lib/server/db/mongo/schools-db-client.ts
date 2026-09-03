import type { Collection, Db, WithId } from "mongodb"
import type { ISchoolsDbClient } from "$lib/types/db/db-client"
import type { MetricCount, NewSchool, School } from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful } from "$lib/utils/metric-constants.js"
import { incrementCount } from "../../metrics/handle-metrics"

export class SchoolsDbClient implements ISchoolsDbClient {
  private schoolsCollection: Collection<NewSchool>

  constructor(db: Db) {
    this.schoolsCollection = db.collection<NewSchool>("schools")
  }

  async getSchool(schoolNumber: string): Promise<School | null> {
    const school: WithId<NewSchool> | null = await this.schoolsCollection.findOne({ schoolNumber })
    if (!school) {
      return null
    }

    return {
      ...school,
      _id: school._id.toString()
    }
  }

  async getSchools(): Promise<School[]> {
    const schools = await this.schoolsCollection.find({}).toArray()
    return schools.map((school) => {
      return {
        ...school,
        _id: school._id.toString()
      }
    })
  }

  async createSchool(school: NewSchool): Promise<string> {
    const existingSchool = await this.schoolsCollection.countDocuments({ schoolNumber: school.schoolNumber })
    if (existingSchool > 0) {
      throw new Error(`School with schoolNumber: ${school.schoolNumber} already exists`)
    }

    const result = await this.schoolsCollection.insertOne(school)

    const metricBody: MetricCount = {
      name: "School_Create",
      description: "Number of schools created"
    }

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [[metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to create school")
    }

    incrementCount({
      ...metricBody,
      labels: [[metricsResultName, metricsResultSuccessful]]
    })

    return result.insertedId.toString()
  }

  async updateSchool(schoolNumber: string, schoolData: NewSchool): Promise<string> {
    const result = await this.schoolsCollection.updateOne({ schoolNumber }, { $set: schoolData })

    const metricBody: MetricCount = {
      name: "School_Update",
      description: "Number of schools updated"
    }

    if (result.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricsResultName, metricsResultFailure]]
      })

      throw new Error(`School with schoolNumber: ${schoolNumber} not found`)
    }

    if (result.modifiedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricsResultName, metricsResultFailure]]
      })

      throw new Error(`Failed to update school with schoolNumber: ${schoolNumber}`)
    }

    incrementCount({
      ...metricBody,
      labels: [[metricsResultName, metricsResultSuccessful]]
    })

    return schoolNumber
  }

  async deleteSchool(schoolNumber: string): Promise<void> {
    const result = await this.schoolsCollection.deleteOne({ schoolNumber })

    const metricBody: MetricCount = {
      name: "School_Remove",
      description: "Number of schools removed"
    }

    if (result.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [[metricsResultName, metricsResultFailure]]
      })

      throw new Error(`Failed to delete school with schoolNumber: ${schoolNumber}`)
    }

    incrementCount({
      ...metricBody,
      labels: [[metricsResultName, metricsResultSuccessful]]
    })
  }
}
