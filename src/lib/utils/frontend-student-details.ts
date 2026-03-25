import type { ApplicationInfo, EnrollmentDetails, EnrollmentWithinViewAccessWindow, FrontendStudent, FrontendStudentMainDetails } from "$lib/types/app-types"
import { getPeriodDetails } from "./period"

export const getEnrollmentsWithinViewAccessWindow = (student: FrontendStudent, APP_INFO: ApplicationInfo): EnrollmentWithinViewAccessWindow[] => {
  const enrollmentsWithinViewAccessWindow: EnrollmentWithinViewAccessWindow[] = []

  for (const enrollment of student.studentEnrollments) {
    const periodDetails = getPeriodDetails(enrollment.period, APP_INFO)
    if (periodDetails.active || periodDetails.withinViewAccessWindow) {
      enrollmentsWithinViewAccessWindow.push({
        systemId: enrollment.systemId,
        mainSchool: enrollment.mainSchool,
        school: enrollment.school,
        period: periodDetails,
        classMemberships: enrollment.classMemberships
          .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
          .filter((membership) => membership.period.active || membership.period.withinViewAccessWindow),
        contactTeacherGroupMemberships: enrollment.contactTeacherGroupMemberships
          .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
          .filter((membership) => membership.period.active || membership.period.withinViewAccessWindow),
        teachingGroupMemberships: enrollment.teachingGroupMemberships
          .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
          .filter((membership) => membership.period.active || membership.period.withinViewAccessWindow)
      })
    }
  }

  return enrollmentsWithinViewAccessWindow
}

export const getEnrollmentDetails = (enrollment: EnrollmentWithinViewAccessWindow): EnrollmentDetails => {
  const school = enrollment.school
  const classGroups = enrollment.classMemberships.map((membership) => membership.classGroup)
  const contactTeacherGroup = enrollment.contactTeacherGroupMemberships.find((membership) => membership)?.contactTeacherGroup || null
  const teachingGroups = enrollment.teachingGroupMemberships.map((membership) => membership.teachingGroup)

  return {
    period: enrollment.period,
    school,
    classGroups,
    contactTeacherGroup,
    teachingGroups
  }
}


export const getFrontendStudentMainDetails = (enrollmentsWithinViewAccessWindow: EnrollmentWithinViewAccessWindow[]): FrontendStudentMainDetails => {
  const mainEnrollment = enrollmentsWithinViewAccessWindow.find((enrollment) => enrollment.mainSchool)
  const mainSchool = mainEnrollment?.school || null
  const mainClass = mainEnrollment?.classMemberships.find((membership) => membership)?.classGroup || null
  const mainContactTeacherGroup = mainEnrollment?.contactTeacherGroupMemberships.find((membership) => membership)?.contactTeacherGroup || null

  return {
    mainSchool,
    mainClass,
    mainContactTeacherGroup
  }
}
