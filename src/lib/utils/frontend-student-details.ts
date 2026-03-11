import type { ApplicationInfo, FrontendStudent, FrontendStudentDetails } from "$lib/types/app-types"
import type { SchoolInfo } from "$lib/types/db/shared-types"
import { getPeriodDetails } from "./period"

export const getFrontendStudentDetails = (student: FrontendStudent, APP_INFO: ApplicationInfo): FrontendStudentDetails => {
  const mainEnrollment = student.studentEnrollments.find((enrollment) => enrollment.mainSchool)

  if (!mainEnrollment) {
    return {
      mainSchool: null,
      mainClassMembership: null,
      mainContactTeacherGroupMembership: null,
      additionalSchools: []
    }
  }

  const mainSchool = mainEnrollment.school
  const mainClassMembership = mainEnrollment.classMemberships
    .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
    .find((membership) => membership.period.active || membership.period.withinViewAccessWindow)
  const mainContactTeacherGroupMembership = mainEnrollment.contactTeacherGroupMemberships
    .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
    .find((membership) => membership.period.active || membership.period.withinViewAccessWindow)

  const additionalSchools: SchoolInfo[] = []
  for (const enrollment of student.studentEnrollments || []) {
    if (enrollment.school.schoolNumber === mainSchool?.schoolNumber) {
      continue
    }
    const enrollmentPeriod = getPeriodDetails(enrollment.period, APP_INFO)
    if (!enrollmentPeriod.active && !enrollmentPeriod.withinViewAccessWindow) {
      continue
    }
    if (!additionalSchools.some((school) => school.schoolNumber === enrollment.school.schoolNumber)) {
      additionalSchools.push(enrollment.school)
    }
  }

  return {
    mainSchool: mainSchool || null,
    mainClassMembership: mainClassMembership || null,
    mainContactTeacherGroupMembership: mainContactTeacherGroupMembership || null,
    additionalSchools
  }
}
