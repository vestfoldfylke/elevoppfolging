export type KeysToNumber<T> = {
	[K in keyof T]: number
}
