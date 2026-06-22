import { type Collection, type Db, type Filter, ObjectId } from "mongodb"
import type { AccessEntry, StudentMemberships } from "$lib/types/app-types"
import type { IAccessDbClient } from "$lib/types/db/db-client"
import type { Access, DbAccess, ManualAccessEntryInput, MetricCount, MetricLabel, NewAccess, NewDbAccess } from "$lib/types/db/shared-types"
import { incrementCount, metricResultFailure, metricResultName, metricResultSuccessful } from "../../metrics/handle-metrics"

export class AccessDbClient implements IAccessDbClient {
  private accessCollection: Collection<NewDbAccess>

  constructor(db: Db) {
    this.accessCollection = db.collection<NewDbAccess>("access")
  }

  async getPrincipalAccess(entraUserId: string): Promise<Access | null> {
    const access = await this.accessCollection.findOne({ entraUserId })
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

  async getManualAccess(schoolNumber: string): Promise<Access[]> {
    const accessList = await this.accessCollection
      .find({
        $or: [
          {
            manageManualStudentsForSchools: { $exists: true, $ne: [], $elemMatch: { schoolNumber } }
          },
          {
            allStudentsAtSchools: { $exists: true, $ne: [], $elemMatch: { schoolNumber } }
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
        allStudentsAtSchools: access.allStudentsAtSchools.filter((entry) => entry.schoolNumber === schoolNumber),
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

  async createAccess(access: NewAccess): Promise<string> {
    const accessToInsert: NewDbAccess = {
      ...access,
      programAreas: access.programAreas.map((programAreaAccessEntry) => ({
        ...programAreaAccessEntry,
        _id: new ObjectId(programAreaAccessEntry._id)
      })),
      students: access.students.map((studentAccessEntry) => ({
        ...studentAccessEntry,
        _id: new ObjectId(studentAccessEntry._id)
      }))
    }

    const result = await this.accessCollection.insertOne(accessToInsert)

    if (!result.insertedId) {
      throw new Error("Failed to create access")
    }

    return result.insertedId.toString()
  }

  async addAccessEntry(entraUserId: string, schoolName: string, accessEntry: AccessEntry): Promise<string> {
    let updateResult: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { leaderForSchools: accessEntry } })
        break
      case "MANUELL-ALLE-ELEVER-VED-SKOLE-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { allStudentsAtSchools: accessEntry } })
        break
      case "MANUELL-ELEV-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { students: { ...accessEntry, _id: new ObjectId(accessEntry._id) } } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { classes: accessEntry } })
        break
      case "MANUELL-PROGRAMOMRÅDE-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { programAreas: { ...accessEntry, _id: new ObjectId(accessEntry._id) } } })
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        updateResult = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $push: { manageManualStudentsForSchools: accessEntry } })
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
      ["schoolName", schoolName],
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

    return updateResult._id.toString()
  }

  async removeAccessEntry(entraUserId: string, schoolName: string, accessEntry: ManualAccessEntryInput): Promise<string> {
    let updatedAccess: DbAccess | null
    switch (accessEntry.type) {
      case "MANUELL-SKOLELEDER-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { leaderForSchools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-ALLE-ELEVER-VED-SKOLE-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { allStudentsAtSchools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { manageManualStudentsForSchools: { schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-ELEV-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { students: { _id: new ObjectId(accessEntry._id), schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-KLASSE-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { classes: { systemId: accessEntry.systemId, schoolNumber: accessEntry.schoolNumber } } })
        break
      case "MANUELL-PROGRAMOMRÅDE-TILGANG":
        updatedAccess = await this.accessCollection.findOneAndUpdate({ entraUserId }, { $pull: { programAreas: { _id: new ObjectId(accessEntry._id), schoolNumber: accessEntry.schoolNumber } } })
        break
    }

    const metricBody: MetricCount = {
      name: "AccessEntry_Remove",
      description: "Number of access entries removed",
      splitMetricByLabels: true
    }
    const labels: MetricLabel[] = [
      ["schoolNumber", accessEntry.schoolNumber],
      ["schoolName", schoolName],
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

    return updatedAccess._id.toString()
  }

  async getSchoolLeaderAccess(): Promise<Access[]> {
    const accessList = await this.accessCollection.find({ leaderForSchools: { $exists: true, $ne: [] } }).toArray()
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

  async getStudentAccess(studentId: string, studentMemberships: StudentMemberships, studentProgramAreaIds: string[]): Promise<Access[]> {
    const query: Filter<DbAccess> = {
      $or: [
        { "leaderForSchools.schoolNumber": { $in: studentMemberships.schoolNumbers } },
        { "allStudentsAtSchools.schoolNumber": { $in: studentMemberships.schoolNumbers } },
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

    const accessList = await this.accessCollection.find(query).toArray()

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
}
