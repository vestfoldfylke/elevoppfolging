export class FormActionError extends Error {
	status: number
	values: Record<string, unknown>
	originalError?: unknown
	constructor(status: number, message: string, values: Record<string, unknown>, originalError?: unknown) {
		super(message)
		this.status = status
		this.name = "FormActionError"
		this.values = values
		this.originalError = originalError
	}
}
