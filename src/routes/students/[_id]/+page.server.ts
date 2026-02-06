import { getAccessType } from "$lib/server/authorization/access-type"
import { getDbClient } from "$lib/server/db/get-db-client"
import { FormActionError } from "$lib/server/middleware/form-action-error"
import { HTTPError } from "$lib/server/middleware/http-error"
import { serverActionRequestMiddleware, serverLoadRequestMiddleware } from "$lib/server/middleware/http-request"
import type { AccessType, DocumentMessageType, StudentDocumentType } from "$lib/types/app-types"
import type { AuthenticatedPrincipal } from "$lib/types/authentication"
import type { IDbClient } from "$lib/types/db/db-client"
import type { Access, AppStudent, DocumentBase, DocumentMessage, DocumentMessageBase, NewDocumentMessage, NewStudentDocument, StudentDocument } from "$lib/types/db/shared-types"
import type { ServerActionNextFunction, ServerLoadNextFunction } from "$lib/types/middleware/http-request"
import type { Actions, PageServerLoad } from "./$types"

type StudentPageData = {
	student: AppStudent
	accessType: AccessType
	documents: StudentDocument[]
}

const getStudent: ServerLoadNextFunction<StudentPageData> = async ({ principal, requestEvent }) => {
	const studentDbId = requestEvent.params._id
	if (!studentDbId) {
		throw new Error("Student ID is missing in request parameters")
	}

	const dbClient: IDbClient = getDbClient()

	/*
	- Først henter vi tilgangene til brukeren
	- Så henter vi eleven basert på ID
	- Så har vi en støgg funksjon som sjekker at brukeren har tilgang til denne eleven - og hva slags tilgang, for da kan vi lage litt tester på funksjonen, i stedet for en psyjo query monster
	*/

	const access: Access | null = await dbClient.getAccess(principal)
	if (!access) {
		throw new HTTPError(404, "No access found for principal")
	}

	const student: AppStudent | null = await dbClient.getStudentById(studentDbId)
	if (!student) {
		throw new HTTPError(404, "Student not found")
	}

	const accessType: AccessType | null = await getAccessType(student, access)

	if (!accessType) {
		throw new HTTPError(403, "No access to this student")
	}

	// Get student documents (streaming)
	const documents: StudentDocument[] = await dbClient.getStudentDocuments(studentDbId)

	return {
		data: {
			student,
			accessType,
			documents
		},
		isAuthorized: true
	}
}

export const load: PageServerLoad = async (requestEvent): Promise<StudentPageData> => {
	requestEvent.setHeaders({
		"X-Accel-Buffering": "no" // Disable response buffering for streaming
	})
	return await serverLoadRequestMiddleware(requestEvent, getStudent)
}

type NewDocumentData = {
	documentId?: string
	type: StudentDocumentType
	schoolNumber: string
	studentId: string
	title: string
	note: string | null
}

type CreatedDocument = {
	documentId: string
}

type CreateDocumentFailedData = {
	createDocumentFailedData: {
		type: StudentDocumentType | null
		schoolNumber: string | null
		title: string | null
		note: string | null
		errorMessage: string
	}
}

const createStudentDocument = (documentData: NewDocumentData, principal: AuthenticatedPrincipal): NewStudentDocument => {
	const { type, schoolNumber, title, note, studentId } = documentData

	const newDocumentBase: DocumentBase = {
		schoolNumber,
		title,
		created: {
			by: {
				entraUserId: principal.id,
				fallbackName: principal.displayName
			},
			at: new Date().toISOString()
		}
	}

	switch (type) {
		case "NOTE": {
			if (!note || typeof note !== "string") {
				throw new FormActionError(400, "Note text is required and must be a string.", { note })
			}
			const newDocument: NewStudentDocument = {
				...newDocumentBase,
				type: "NOTE",
				content: {
					text: note
				},
				messages: [],
				student: {
					_id: studentId
				}
			}

			return newDocument
		}

		case "FOLLOW_UP": {
			throw new Error("Follow-up creation not implemented yet")
		}

		default: {
			throw new FormActionError(400, "Invalid document type.", { type })
		}
	}
}

const newDocument: ServerActionNextFunction<CreatedDocument> = async ({ requestEvent, principal }) => {
	const studentId = requestEvent.params._id
	if (!studentId || typeof studentId !== "string") {
		throw new HTTPError(400, "Student ID is missing in request parameters")
	}

	// get form data fields and validate
	const formData = await requestEvent.request.formData()
	const type: StudentDocumentType | null = formData.get("type") as StudentDocumentType | null
	const schoolNumber = formData.get("schoolNumber") as string | null
	const title = formData.get("title") as string | null
	const note = formData.get("note") as string | null

	const returnOnFail: CreateDocumentFailedData = {
		createDocumentFailedData: {
			type,
			schoolNumber,
			title,
			note,
			errorMessage: "Failed to create document, check the values and try again."
		}
	}

	if (!type || typeof type !== "string") {
		returnOnFail.createDocumentFailedData.errorMessage = "Document type is required and must be a string."
		throw new FormActionError(400, "Document type is required and must be a string.", returnOnFail)
	}
	if (!schoolNumber || typeof schoolNumber !== "string") {
		returnOnFail.createDocumentFailedData.errorMessage = "School number is required and must be a string."
		throw new FormActionError(400, "School number is required and must be a string.", returnOnFail)
	}
	if (!title || typeof title !== "string") {
		returnOnFail.createDocumentFailedData.errorMessage = "Title is required and must be a string."
		throw new FormActionError(400, "Title is required and must be a string.", returnOnFail)
	}

	const newDocumentData: NewDocumentData = {
		type,
		schoolNumber,
		title,
		note,
		studentId
	}

	const newDocument: NewStudentDocument = createStudentDocument(newDocumentData, principal)

	const dbClient: IDbClient = getDbClient()
	try {
		const documentId = await dbClient.createStudentDocument(newDocument)
		return {
			data: {
				documentId
			},
			isAuthorized: true
		}
	} catch (error) {
		throw new FormActionError(500, "Error creating student document, try again", returnOnFail, error)
	}
}

type CreateMessageFailedValues = {
	type: DocumentMessageType | null
	title: string | null
	comment: string | null
	update: string | null,
	errorMessage: string
}

type CreateMessageFailedData = {
	createMessageFailedData: Record<string, CreateMessageFailedValues>
}

type NewMessageData = {
	type: DocumentMessageType
	title: string | null
	comment: string | null
	update: string | null
}

const createDocumentMessage = (messageData: NewMessageData, principal: AuthenticatedPrincipal): NewDocumentMessage => {
	const { type, title, comment, update } = messageData

	const newMessageBase: DocumentMessageBase = {
		created: {
			by: {
				entraUserId: principal.id,
				fallbackName: principal.displayName
			},
			at: new Date().toISOString()
		}
	}

	switch (type) {
		case "COMMENT": {
			if (!comment || typeof comment !== "string") {
				throw new FormActionError(400, "Comment text is required and must be a string.", { comment })
			}
			const newMessage: NewDocumentMessage = {
				...newMessageBase,
				type: "COMMENT",
				content: {
					text: comment
				}
			}

			return newMessage
		}
		case "UPDATE": {
			if (!update || typeof update !== "string") {
				throw new FormActionError(400, "Update text is required and must be a string.", { update })
			}
			if (!title || typeof title !== "string") {
				throw new FormActionError(400, "Title is required and must be a string.", { title })
			}
			const newMessage: NewDocumentMessage = {
				...newMessageBase,
				type: "UPDATE",
				title,
				content: {
					text: update
				}
			}

			return newMessage
		}

		default: {
			throw new FormActionError(400, "Invalid message type.", { type })
		}
	}
}

type CreatedMessage = {
	createdMessage: DocumentMessage
}

const newMessage: ServerActionNextFunction<CreatedMessage> = async ({ requestEvent, principal }) => {
	const studentId = requestEvent.params._id
	if (!studentId || typeof studentId !== "string") {
		throw new HTTPError(400, "Student ID is missing in request parameters")
	}

	// get form data fields and validate
	const formData = await requestEvent.request.formData()
	const documentId = formData.get("documentId") as string | null
	const type: DocumentMessageType | null = formData.get("type") as DocumentMessageType | null
	const title = formData.get("title") as string | null
	const comment = formData.get("comment") as string | null
	const update = formData.get("update") as string | null

	if (!documentId || typeof documentId !== "string") {
		throw new FormActionError(400, "Document ID is required and must be a string.", {})
	}

	const returnOnFail: CreateMessageFailedData = {
		createMessageFailedData: {
			[documentId]: {
				type,
				title,
				comment,
				update,
				errorMessage: "Failed to create message, check the values and try again."
			}
		}
	}


	if (!type || typeof type !== "string") {
		returnOnFail.createMessageFailedData[documentId].errorMessage = "Message type is required and must be a string."
		throw new FormActionError(400, "Message-type is required and must be a string.", returnOnFail)
	}

	const newMessageData: NewMessageData = {
		type,
		title,
		comment,
		update
	}

	const newDocument: NewDocumentMessage = createDocumentMessage(newMessageData, principal)

	const dbClient: IDbClient = getDbClient()
	try {
		const message = await dbClient.addDocumentMessage(documentId, newDocument)
		return {
			data: {
				createdMessage: message
			},
			isAuthorized: true
		}
	} catch (error) {
		throw new FormActionError(500, "Error creating student document, try again", returnOnFail, error)
	}
}

export const actions = {
	newDocumentAction: async (event) => {
		return serverActionRequestMiddleware<CreatedDocument, CreateDocumentFailedData>(event, newDocument)
	},
	newMessageAction: async (event) => {
		return serverActionRequestMiddleware<CreatedMessage, CreateMessageFailedData>(event, newMessage)
	}
} satisfies Actions
