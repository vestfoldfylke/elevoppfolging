import { logger } from "@vestfoldfylke/loglady"
import { type Db, type Filter, MongoClient, ObjectId, type WithId } from "mongodb"
import { env } from "$env/dynamic/private"
import type { SimpleAppStudent } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { Access, AppStudent, DbAccess, DbAppStudent, DbStudentDocument, DocumentMessage, NewDocumentMessage, NewStudentDocument, ProgramArea, StudentDocument } from "$lib/types/db/shared-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { KeysToNumber } from "$lib/types/db/db-helpers"
import type { DbProgramArea } from "$lib/types/program-area"

export class MongoDbClient implements IDbClient {
	private readonly mongoClient: MongoClient
	private db: Db | null = null
	private readonly accessCollectionName = "access"
	private readonly studentsCollectionName = "students"
	private readonly usersCollectionName = "users"
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
			this.db = this.mongoClient.db(env.MONGODB_DB_NAME)
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

	async getStudents(access: Access): Promise<SimpleAppStudent[]> {
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

		const allStudents = await studentsCollection.find(query)

		const projection: KeysToNumber<WithId<SimpleAppStudent>> = {
			_id: 1,
			active: 1,
			feideName: 1,
			name: 1,
			studentNumber: 1,
			systemId: 1
		}

		const projectedStudents = await allStudents.project<SimpleAppStudent>(projection).toArray()

		return projectedStudents.map((student) => {
			return {
				...student,
				_id: student._id.toString()
			}
		})
	}

	async getStudentById(studentDbId: string): Promise<AppStudent | null> {
		const db = await this.getDb()
		const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)
		console.log("Fetching student with ID:", studentDbId)
		const student = await studentsCollection.findOne({ _id: new ObjectId(studentDbId) })
		if (!student) {
			return null
		}

		// TODO: Correct projection to only include necessary fields (find type-safe way)

		return {
			_id: student._id.toString(),
			active: student.active,
			feideName: student.feideName,
			name: student.name,
			studentEnrollments: student.studentEnrollments,
			studentNumber: student.studentNumber,
			systemId: student.systemId,
			ssn: "nei",
			lastSynced: "nei"
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

		const documents = await documentsCollection.aggregate<DocumentWithCreator>([
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
		]).toArray()

		// Todo: Add projection to only include necessary fields - And authorization

		// Sleep 5 seconds to simulate long-running operation and test streaming
		// await new Promise((resolve) => setTimeout(resolve, 2500))

		return documents.map((document: DocumentWithCreator): StudentDocument => {
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
		}).sort((a, b) => new Date(b.created.at).getTime() - new Date(a.created.at).getTime()) // Sort by created date descending
	}

	async createStudentDocument(document: NewStudentDocument): Promise<string> {
		const db = await this.getDb()
		const documentsCollection = db.collection<NewStudentDocument>(this.documentsCollectionName)

		const result = await documentsCollection.insertOne(document)
		return result.insertedId.toString()
	}

	async addDocumentMessage(documentId: string, message: NewDocumentMessage): Promise<DocumentMessage> {
		const db = await this.getDb()
		const documentsCollection = db.collection<DbStudentDocument>(this.documentsCollectionName)

		const messageWithId = {
			...message,
			messageId: new ObjectId().toString()
		}

		const result = await documentsCollection.updateOne(
			{ _id: new ObjectId(documentId) },
			{ $push: { messages: messageWithId } }
		)

		if (result.modifiedCount === 0) {
			throw new Error("Failed to add message to document")
		}

		return messageWithId
	}
}
