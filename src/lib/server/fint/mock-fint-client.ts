import type { IFintClient } from "$lib/types/fint/fint-client"
import type { FintSchool } from "$lib/types/fint/fint-school"
import type { FintSchoolWithStudents } from "$lib/types/fint/fint-school-with-students"
import { generateMockFintSchoolsWithStudents } from "./mock-fint-data"
import { writeFileSync } from "node:fs"

console.log("Generating mock FINT data...")

const mockSchools: FintSchoolWithStudents[] = generateMockFintSchoolsWithStudents({
	numberOfKlasser: 5,
	numberOfKontaktlarergrupper: 3,
	numberOfUndervisningsgrupper: 4,
	numberOfUndervisningsforhold: 6,
	numberOfStudents: 50,
	schoolNames: ["VGS Example School", "Another VGS School"]
})

// write to file for now

writeFileSync("./drit/mockSchools.json", JSON.stringify(mockSchools, null, 2))


export class MockFintClient implements IFintClient {
	async getSchools(): Promise<FintSchool[]> {
		return mockSchools.map(s => {
			if (!s.skole) {
				throw new Error("School data is missing skole property")
			}
			return {
				skolenummer: s.skole?.skolenummer,
				navn: s.skole?.navn
			}
		})
	}
	async getSchoolWithStudents(schoolNumber: string): Promise<FintSchoolWithStudents> {
		const mockSchool = mockSchools.find(s => s.skole?.skolenummer.identifikatorverdi === schoolNumber)
		if (!mockSchool) {
			throw new Error(`Mock school with school number ${schoolNumber} not found`)
		}
		return mockSchool
	}
}
