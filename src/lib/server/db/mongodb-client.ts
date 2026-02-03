import { env } from "$env/dynamic/private";
import type { AuthenticatedPrincipal } from "$lib/types/authentication";
import type { DbAccess, DbAppStudent } from "$lib/types/db/db";
import type { IDbClient } from "$lib/types/db/db-client";
import type { KeysToNumber } from "$lib/types/db/db-helpers";
import type { DbProgramArea } from "$lib/types/program-area";
import type { Access, AppStudent, ProgramArea, SimpleAppStudent } from "$lib/types/app-types";
import { logger } from "@vestfoldfylke/loglady";
import { Db, MongoClient, ObjectId, type Filter } from "mongodb";

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

    const schoolNumbers: string[] = access.schools.map(entry => {
      return entry.schoolNumber
    })

    const classSystemIds: string[] = access.classes.map(entry => {
      return entry.systemId
    })
    const teachingGroupSystemIds: string[] = access.teachingGroups.map(entry => {
      return entry.systemId
    })
    const contactTeacherGroupSystemIds: string[] = access.contactTeacherGroups.map(entry => {
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
    };

	  const allStudents = await studentsCollection.find(query)

    const projection: KeysToNumber<SimpleAppStudent> = {
      _id: 1,
      active: 1,
      feideName: 1,
      name: 1,
      studentNumber: 1,
      systemId: 1
    }

    const projectedStudents = await allStudents.project<SimpleAppStudent>(projection).toArray()

    return projectedStudents.map(student => {
      return {
        ...student,
        _id: student._id.toString()
      }
    })
  }

  async getStudentById(studentDbId: string): Promise<AppStudent | null> {
    const db = await this.getDb()
    const studentsCollection = db.collection<DbAppStudent>(this.studentsCollectionName)
    console.log("Fetching student with ID:", studentDbId);
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
      systemId: student.systemId
    }
  }
}