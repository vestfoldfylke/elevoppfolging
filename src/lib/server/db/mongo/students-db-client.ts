import { logger } from "@vestfoldfylke/loglady"
import { type Binary, type Db, type InsertOneResult, ObjectId, type UpdateResult, type WithId } from "mongodb"
import type { FrontendStudent } from "$lib/types/app-types"
import type { IStudentsDbClient } from "$lib/types/db/db-client"
import type { KeysToNumber } from "$lib/types/db/db-helpers"
import type { AppStudent, DbAppStudent, DbEncryptedAppStudent, MetricCount, MetricLabel, NewAppStudent, SchoolInfo, StudentEnrollment, UpdateAppStudent } from "$lib/types/db/shared-types"
import { metricsResultFailure, metricsResultName, metricsResultSuccessful } from "$lib/utils/metric-constants.js"
import { APP_INFO } from "../../app-info"
import { incrementCount } from "../../metrics/handle-metrics"

export class StudentsDbClient implements IStudentsDbClient {
  private encryptionDb: Db
  private readonly encryptValue: (value: unknown) => Promise<Binary>
  private readonly studentsCollectionName: string = "students"

  constructor(db: Db, encryptValue: (value: unknown) => Promise<Binary>) {
    this.encryptionDb = db
    this.encryptValue = encryptValue
  }

  async getAllStudents(): Promise<FrontendStudent[]> {
    const studentsCollection = this.encryptionDb.collection<DbAppStudent>(this.studentsCollectionName)

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
      hasBlockedAddress: 1
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

  async getStudentBySsn(ssn: string): Promise<FrontendStudent | null> {
    const studentsCollection = this.encryptionDb.collection<DbAppStudent>(this.studentsCollectionName)

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
      source: 1,
      hasBlockedAddress: 1
    }

    const student: DbAppStudent | null = await studentsCollection.findOne({ ssn }, { projection })
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
      source: student.source,
      hasBlockedAddress: student.hasBlockedAddress ?? false
    }
  }

  async getStudentById(studentId: string): Promise<AppStudent | null> {
    const studentsCollection = this.encryptionDb.collection<DbAppStudent>(this.studentsCollectionName)

    logger.info("Getting student by id")

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
      source: 1,
      hasBlockedAddress: 1
    }

    const student: DbAppStudent | null = await studentsCollection.findOne({ _id: new ObjectId(studentId) }, { projection })
    if (!student) {
      return null
    }

    logger.info("Student by id found. StudentId: {StudentId}", student._id.toString())

    return {
      ...student,
      _id: student._id.toString()
    }
  }

  async createManualStudent(manualStudent: NewAppStudent): Promise<string> {
    const studentsCollection = this.encryptionDb.collection<DbEncryptedAppStudent>(this.studentsCollectionName)

    logger.info("Creating new manual student with systemId: {SystemId}", manualStudent.systemId)

    const encryptedHasBlockedAddress: Binary = await this.encryptValue(manualStudent.hasBlockedAddress ?? false)

    const encryptedManualStudent: DbEncryptedAppStudent = {
      ...manualStudent,
      _id: new ObjectId(),
      hasBlockedAddress: encryptedHasBlockedAddress
    }

    const result: InsertOneResult<DbEncryptedAppStudent> = await studentsCollection.insertOne(encryptedManualStudent)

    const mainSchool: SchoolInfo | undefined = manualStudent.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school
    const metricBody: MetricCount = {
      name: "Student_Create",
      description: "Number of manual students created"
    }
    const labels: MetricLabel[] = []

    if (mainSchool) {
      labels.push(["schoolNumber", mainSchool.schoolNumber])
      labels.push(["schoolName", mainSchool.name])
    }

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to insert manual student")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    return result.insertedId.toString()
  }

  async updateStudent(student: UpdateAppStudent): Promise<string> {
    const studentsCollection = this.encryptionDb.collection<DbEncryptedAppStudent>(this.studentsCollectionName)

    logger.info("Updating student with Id: {Id}", student._id)

    const encryptedHasBlockedAddress: Binary = await this.encryptValue(student.hasBlockedAddress ?? false)

    const manualStudentWithId: DbEncryptedAppStudent = {
      ...student,
      _id: new ObjectId(student._id),
      hasBlockedAddress: encryptedHasBlockedAddress
    }

    const result: UpdateResult<DbEncryptedAppStudent> = await studentsCollection.updateOne({ _id: manualStudentWithId._id }, { $set: manualStudentWithId })

    const mainSchool: SchoolInfo | undefined = student.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.mainSchool)?.school
    const metricBody: MetricCount = {
      name: "Student_Update",
      description: "Number of manual students updated or manual enrollments added/removed"
    }
    const labels: MetricLabel[] = []

    if (mainSchool) {
      labels.push(["schoolNumber", mainSchool.schoolNumber])
      labels.push(["schoolName", mainSchool.name])
    }

    if (!result.acknowledged) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to update student")
    }

    if (result.modifiedCount !== 1) {
      incrementCount({
        ...metricBody,
        labels: [...labels, [metricsResultName, metricsResultFailure]]
      })

      throw new Error("Failed to update student")
    }

    incrementCount({
      ...metricBody,
      labels: [...labels, [metricsResultName, metricsResultSuccessful]]
    })

    logger.info("Student with Id {Id} updated", student._id)
    return student._id
  }
}
