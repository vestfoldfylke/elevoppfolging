import type { FintSchool } from "./fint-school"
import type { FintSchoolWithStudents } from "./fint-school-with-students"


export interface IFintClient {
	/** Henter alle elever fra FINT APIet */
	getSchools: () => Promise<FintSchool[]>
	getSchoolWithStudents: (schoolNumber: string) => Promise<FintSchoolWithStudents>
}
