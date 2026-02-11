import { logger } from "@vestfoldfylke/loglady"
import { type Db, type Filter, MongoClient, ObjectId, type WithId } from "mongodb"
import { env } from "$env/dynamic/private"
import type { FrontendOverviewStudent, FrontendStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { IDbClient } from "$lib/types/db/db-client"
import type { KeysToNumber } from "$lib/types/db/db-helpers"
import type {
	Access,
	DbAccess,
	DbAppStudent,
	DbStudentDocument,
	DbStudentImportantStuff,
	DocumentMessage,
	EditorData,
	ImportantStuffBase,
	NewDbStudentImportantStuff,
	NewDocumentMessage,
	NewStudentDocument,
	NewStudentImportantStuff,
	ProgramArea,
	StudentDocument,
	StudentImportantStuff
} from "$lib/types/db/shared-types"
import type { DbProgramArea } from "$lib/types/program-area"

export class MongoDbClient implements IDbClient {
	private readonly mongoClient: MongoClient
	private db: Db | null = null
	private readonly accessCollectionName = "access"
	private readonly studentsCollectionName = "students"
	private readonly usersCollectionName = "users"
	private readonly importantStuffCollectionName = "important-stuff"
	private readonly programAreasCollectionName = "program-areas"
	private readonly documentsCollectionName = "documents"

	constructor() {
		if (!env.MONGODB_CONNECTION_STRING) {
			throw new Error("MONGODB_CONNECTION_STRING is not set (du har glemt den)")
		}
		this.mongoClient = new MongoClient(env.MONGODB_CONNECTION_STRING)
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

	async getAccess(principal: AuthenticatedPrincipal): Promise<Access | null> {
		const db = await this.getDb()
		const accessCollection = db.collection<DbAccess>(this.accessCollectionName)
		const access = await accessCollection.findOne({ entraUserId: principal.id })
		if (!access) {
			return null
		}

		return {
			...access,
			_id: access._id.toString()
		}
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

	async getStudents(access: Access): Promise<FrontendOverviewStudent[]> {
		const db = await this.getDb()
		const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)

		const schoolNumbers: string[] = access.schools.map((entry) => {
			return entry.schoolNumber
		})

		const classSystemIds: string[] = access.classes.map((entry) => {
			return entry.systemId
		})
		const teachingGroupSystemIds: string[] = access.teachingGroups.map((entry) => {
			return entry.systemId
		})
		const contactTeacherGroupSystemIds: string[] = access.contactTeacherGroups.map((entry) => {
			return entry.systemId
		})

		const query: Filter<DbAppStudent> = {
			$or: [
				{
					"studentEnrollments.school.schoolNumber": { $in: schoolNumbers }
				},
				{
					"studentEnrollments.classMemberships": {
						$elemMatch: {
							"classGroup.systemId": { $in: classSystemIds },
							"period.active": true
						}
					}
				},
				{
					"studentEnrollments.teachingGroupMemberships": {
						$elemMatch: {
							"teachingGroup.systemId": { $in: teachingGroupSystemIds },
							"period.active": true
						}
					}
				},
				{
					"studentEnrollments.contactTeacherGroupMemberships": {
						$elemMatch: {
							"contactTeacherGroup.systemId": { $in: contactTeacherGroupSystemIds },
							"period.active": true
						}
					}
				}
			]
		}

		type StudentWithImportantStuff = DbAppStudent & {
			importantStuff?: StudentImportantStuff[]
		}

		const projection: KeysToNumber<WithId<FrontendOverviewStudent>> = {
			_id: 1,
			active: 1,
			feideName: 1,
			name: 1,
			studentNumber: 1,
			systemId: 1,
			mainSchool: 1,
			mainClass: 1,
			mainContactTeacherGroup: 1,
			importantStuff: 1
		}

		const superAllStudent = await studentsCollection
			.aggregate<StudentWithImportantStuff>([
				{
					$match: query
				},
				{
					$lookup: {
						from: this.importantStuffCollectionName,
						localField: "_id",
						foreignField: "student._id",
						as: "importantStuff"
					}
				}
			])
			.project<FrontendOverviewStudent & { importantStuff: StudentImportantStuff[] }>(projection)
			.toArray()

		return superAllStudent.map((student) => {
			const importantStuffForStudent: StudentImportantStuff | null = student.importantStuff && student.importantStuff.length > 0 ? student.importantStuff[0] : null
			if (importantStuffForStudent) {
				importantStuffForStudent._id = importantStuffForStudent._id.toString()
				importantStuffForStudent.student._id = importantStuffForStudent.student._id.toString()
			}
			return {
				...student,
				_id: student._id.toString(),
				importantStuff: importantStuffForStudent
			}
		})
	}

	async getStudentById(studentDbId: string): Promise<FrontendStudent | null> {
		const db = await this.getDb()
		const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)
		logger.info("Getting student by _id {studentDbId}", studentDbId)

		const projection: KeysToNumber<WithId<FrontendStudent>> = {
			_id: 1,
			active: 1,
			feideName: 1,
			name: 1,
			studentEnrollments: 1,
			studentNumber: 1,
			systemId: 1,
			mainSchool: 1,
			mainClass: 1,
			mainContactTeacherGroup: 1
		}

		const student = await studentsCollection.findOne({ _id: new ObjectId(studentDbId) }, { projection })
		if (!student) {
			return null
		}
		logger.info("Student with _id {studentDbId} found: {feideName}", studentDbId, student.feideName)

		return {
			_id: student._id.toString(),
			active: student.active,
			feideName: student.feideName,
			name: student.name,
			studentEnrollments: student.studentEnrollments,
			studentNumber: student.studentNumber,
			systemId: student.systemId,
			mainClass: student.mainClass,
			mainContactTeacherGroup: student.mainContactTeacherGroup,
			mainSchool: student.mainSchool
		}
	}

	async getStudentDocuments(studentDbId: string): Promise<StudentDocument[]> {
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
						"student._id": studentDbId
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
					_id: document._id.toString()
				}
				if (createdByDisplayName) {
					studentDocument.created.by.displayName = createdByDisplayName
				}
				return studentDocument
			})
			.sort((a, b) => new Date(b.created.at).getTime() - new Date(a.created.at).getTime()) // Sort by created date descending
	}

	async createStudentDocument(studentId: string, document: NewStudentDocument): Promise<string> {
		const db = await this.getDb()
		const documentsCollection = db.collection<NewStudentDocument>(this.documentsCollectionName)

		if (document.student._id !== studentId) {
			throw new Error("Student ID in document does not match the provided student ID")
		}

		const result = await documentsCollection.insertOne(document)

		try {
			await this.updateStudentLatestActivityTimestamp(document.student._id)
		} catch (error) {
			logger.errorException(
				error,
				"Failed to update student's latest activity timestamp after creating document. Document ID: {documentId}. OBS, returning document ID anyway",
				result.insertedId.toString()
			)
		}

		return result.insertedId.toString()
	}

	async addDocumentMessage(studentId: string, documentId: string, message: NewDocumentMessage): Promise<DocumentMessage> {
		const db = await this.getDb()
		const documentsCollection = db.collection<DbStudentDocument>(this.documentsCollectionName)

		const messageWithId = {
			...message,
			messageId: new ObjectId().toString()
		}

		const result = await documentsCollection.updateOne({ _id: new ObjectId(documentId) }, { $push: { messages: messageWithId } })

		if (result.modifiedCount === 0) {
			throw new Error("Failed to add message to document")
		}

		try {
			await this.updateStudentLatestActivityTimestamp(studentId)
		} catch (error) {
			logger.errorException(error, "Failed to update student's latest activity timestamp after adding document message. Document ID: {documentId}. OBS, returning message anyway", documentId)
		}

		return messageWithId
	}

	async getStudentImportantStuff(studentId: string): Promise<StudentImportantStuff | null> {
		const db = await this.getDb()

		const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)
		logger.info("Getting important stuff for student with _id {studentId}", studentId)

		const importantStuffForStudent = await importantStuffCollection.findOne({ "student._id": new ObjectId(studentId) })
		logger.info("Important stuff for student with _id {studentId} exists: {importantStuffExists}", studentId, importantStuffForStudent !== null)

		if (!importantStuffForStudent) {
			return null
		}

		return {
			...importantStuffForStudent,
			_id: importantStuffForStudent._id.toString(),
			student: {
				_id: importantStuffForStudent.student._id.toString()
			}
		}
	}

	async upsertStudentImportantStuff(studentId: string, importantStuff: NewStudentImportantStuff): Promise<void> {
		const db = await this.getDb()
		const importantStuffCollection = db.collection<DbStudentImportantStuff>(this.importantStuffCollectionName)

		await importantStuffCollection.updateOne(
			{ "student._id": new ObjectId(studentId) },
			{
				$set: {
					...importantStuff,
					student: {
						_id: new ObjectId(studentId)
					}
				}
			},
			{ upsert: true }
		)
	}

	async updateStudentLatestActivityTimestamp(studentId: string): Promise<void> {
		const db = await this.getDb()
		const importantStuffCollection = db.collection<ImportantStuffBase>(this.importantStuffCollectionName)

		const existingImportantStuff = await importantStuffCollection.findOne({ "student._id": new ObjectId(studentId) })

		if (!existingImportantStuff) {
			const editor: EditorData = {
				at: new Date().toISOString(),
				by: {
					entraUserId: "SYSTEM",
					fallbackName: "SYSTEM"
				}
			}
			const newImportantStuff: NewStudentImportantStuff = {
				type: "STUDENT",
				created: editor,
				modified: editor,
				facilitation: [],
				followUp: [],
				importantInfo: "",
				lastActivityTimestamp: new Date().toISOString()
			}

			await importantStuffCollection.insertOne({
				...newImportantStuff,
				student: {
					_id: new ObjectId(studentId)
				}
			} as NewDbStudentImportantStuff)
			return
		}

		await importantStuffCollection.updateOne(
			{ "student._id": new ObjectId(studentId) },
			{
				$set: {
					lastActivityTimestamp: new Date().toISOString()
				}
			}
		)
	}
}
