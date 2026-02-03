import type { ObjectId } from "mongodb"

export type DbProgramArea = {
	_id: ObjectId
	name: string
	classes: {
		systemId: string
		name: string
	}[]
}
