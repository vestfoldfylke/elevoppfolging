import type { Access, AccessType, AppStudent } from "$lib/types/app-types"
import { getDbClient } from "../db/get-db-client"

export const studentHasSchool = (student: AppStudent, schoolNumber: string): boolean => {
	if (schoolNumber.trim() === "") {
		return false
	}
	return student.studentEnrollments.some((enrollment) => enrollment.school.schoolNumber === schoolNumber)
}

export const getSchoolAccess = (student: AppStudent, access: Access): AccessType | undefined => {
	return access.schools.find((entry) => studentHasSchool(student, entry.schoolNumber))
}

export const getExplicitStudentAccess = (student: AppStudent, access: Access): AccessType | undefined => {
	return access.students.find((entry) => entry.systemId === student.systemId && studentHasSchool(student, entry.schoolNumber))
}

export const getProgramAreaAccess = async (student: AppStudent, access: Access): Promise<AccessType | undefined> => {
	if (access.programAreas.length === 0) {
		return undefined
	}

	if (!access.programAreas.some((entry) => studentHasSchool(student, entry.schoolNumber))) {
		return undefined
	}

	const dbClient = getDbClient()
	for (const programAreaAccess of access.programAreas) {
		const programArea = await dbClient.getProgramArea(programAreaAccess._id)
		if (!programArea) {
			continue
		}
		/*
      Må sjekke om eleven er med i en av klassene som hører til dette undervisningsområdet - så fall er det avdelingsleder tilgang
    */
		const isInProgramArea = student.studentEnrollments.some((enrollment) => {
			if (enrollment.school.schoolNumber !== programAreaAccess.schoolNumber) {
				return false
			}
			return enrollment.classMemberships.some((classMembership) => {
				return programArea.classes.some((programAreaClass) => programAreaClass.systemId === classMembership.classGroup.systemId)
			})
		})
		if (isInProgramArea) {
			return programAreaAccess
		}
	}

	return undefined
}

export const getContactTeacherGroupAccess = (student: AppStudent, access: Access): AccessType | undefined => {
	// Da sjekker vi om noen av kontaktlærergruppene til eleven matcher noen av tilgangene
	const isContactTeacherForStudent = access.contactTeacherGroups.find((entry) => {
		return student.studentEnrollments.some((enrollment) => {
			if (enrollment.school.schoolNumber !== entry.schoolNumber) {
				return false
			}
			return enrollment.contactTeacherGroupMemberships.some((membership) => membership.contactTeacherGroup.systemId === entry.systemId)
		})
	})
	return isContactTeacherForStudent
}

export const getClassAccess = (student: AppStudent, access: Access): AccessType | undefined => {
	// Da sjekker vi om noen av klassene til eleven matcher noen av tilgangene
	const isClassTeacherForStudent = access.classes.find((entry) => {
		return student.studentEnrollments.some((enrollment) => {
			if (enrollment.school.schoolNumber !== entry.schoolNumber) {
				return false
			}
			return enrollment.classMemberships.some((membership) => membership.classGroup.systemId === entry.systemId)
		})
	})
	return isClassTeacherForStudent
}

export const getTeachingGroupAccess = (student: AppStudent, access: Access): AccessType | undefined => {
	// Da sjekker vi om noen av undervisningsgruppene til eleven matcher noen av tilgangene
	const isTeachingGroupTeacherForStudent = access.teachingGroups.find((entry) => {
		return student.studentEnrollments.some((enrollment) => {
			if (enrollment.school.schoolNumber !== entry.schoolNumber) {
				return false
			}
			return enrollment.teachingGroupMemberships.some((membership) => membership.teachingGroup.systemId === entry.systemId)
		})
	})
	return isTeachingGroupTeacherForStudent
}

export const getAccessType = async (student: AppStudent, access: Access): Promise<AccessType | null> => {
	/* Strongest access wins
  1. skoleleder
  2. enkeltelev
  3. avdelingsleder / rådgiver
  4. kontaktlærer (automatisk fra kontaktlærergruppe)
  5. faglærere (automatisk undervisningsgruppe og automatisk klasse)
  */
	const schoolAccess = getSchoolAccess(student, access)
	if (schoolAccess) {
		return schoolAccess
	}

	const studentAccess = getExplicitStudentAccess(student, access)
	if (studentAccess) {
		return studentAccess
	}

	const programAreaAccess = await getProgramAreaAccess(student, access)
	if (programAreaAccess) {
		return programAreaAccess
	}

	const contactTeacherAccess = getContactTeacherGroupAccess(student, access)
	if (contactTeacherAccess) {
		return contactTeacherAccess
	}

	const classAccess = getClassAccess(student, access)
	if (classAccess) {
		return classAccess
	}

	const teachingGroupAccess = getTeachingGroupAccess(student, access)
	if (teachingGroupAccess) {
		return teachingGroupAccess
	}

	return null
}
