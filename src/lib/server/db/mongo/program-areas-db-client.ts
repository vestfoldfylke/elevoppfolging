import { type Collection, type Db, ObjectId } from "mongodb"
import type { IProgramAreasDbClient } from "$lib/types/db/db-client"
import type { MetricCount, MetricLabel, NewProgramArea, ProgramArea } from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful, metricsSchoolNameLabelName, metricsSchoolNumberLabelName } from "$lib/utils/metric-constants.js"
import { incrementCount } from "../../metrics/handle-metrics"

export class ProgramAreasDbClient implements IProgramAreasDbClient {
  private programAreasCollection: Collection<NewProgramArea>

  constructor(db: Db) {
    this.programAreasCollection = db.collection<NewProgramArea>("program-areas")
  }

  async getProgramArea(_id: string): Promise<ProgramArea | null> {
    const programArea = await this.programAreasCollection.findOne({ _id: new ObjectId(_id) })

    if (!programArea) {
      return null
    }

    return {
      ...programArea,
      _id: programArea._id.toString()
    }
  }

  async getProgramAreasFromClassIds(classSystemIds: string[]): Promise<ProgramArea[]> {
    const programAreas = await this.programAreasCollection.find({ "classes.systemId": { $in: classSystemIds } }).toArray()

    return programAreas.map((programArea) => ({
      ...programArea,
      _id: programArea._id.toString()
    }))
  }

  async getProgramAreasForSchool(schoolNumber: string): Promise<ProgramArea[]> {
    const programAreas = await this.programAreasCollection.find({ schoolNumber }).toArray()

    return programAreas.map((programArea) => ({
      ...programArea,
      _id: programArea._id.toString()
    }))
  }

  async createProgramArea(schoolName: string, programArea: NewProgramArea): Promise<string> {
    const result = await this.programAreasCollection.insertOne(programArea)

    const metricBody: MetricCount = {
      name: "ProgramArea_Create",
      description: "Number of program areas created"
    }
    const labels: MetricLabel[] = [
      [metricsSchoolNumberLabelName, programArea.schoolNumber],
      [metricsSchoolNameLabelName, schoolName]
    ]

    if (!result.insertedId) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to create program area")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return result.insertedId.toString()
  }

  async updateProgramArea(programAreaId: string, schoolName: string, programArea: NewProgramArea): Promise<string> {
    const updateResult = await this.programAreasCollection.updateOne({ _id: new ObjectId(programAreaId) }, { $set: programArea })

    const metricBody: MetricCount = {
      name: "ProgramArea_Update",
      description: "Number of program areas updated"
    }
    const labels: MetricLabel[] = [
      [metricsSchoolNumberLabelName, programArea.schoolNumber],
      [metricsSchoolNameLabelName, schoolName]
    ]

    if (updateResult.matchedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error(`Program area with id: ${programAreaId} not found, cannot update when it does not exist...`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return programAreaId
  }

  async deleteProgramArea(schoolName: string, programArea: ProgramArea): Promise<void> {
    const deleteResult = await this.programAreasCollection.deleteOne({ _id: new ObjectId(programArea._id) })

    const metricBody: MetricCount = {
      name: "ProgramArea_Remove",
      description: "Number of program areas removed"
    }
    const labels: MetricLabel[] = [
      [metricsSchoolNumberLabelName, programArea.schoolNumber],
      [metricsSchoolNameLabelName, schoolName]
    ]

    if (deleteResult.deletedCount === 0) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error(`Failed to delete program area with id: ${programArea._id}`)
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })
  }
}
