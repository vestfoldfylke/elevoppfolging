import type { ApplicationInfo, EnrollmentDetails, EnrollmentWithinViewAccessWindow, FrontendStudentMainDetails } from "$lib/types/app-types"
import type { ClassMembership, ContactTeacherGroupMembership, StudentEnrollment, Teacher, TeachingGroupMembership } from "$lib/types/db/shared-types"
import { getPeriodDetails } from "./period"

export const getEnrollmentsWithinViewAccessWindow = (studentEnrollments: StudentEnrollment[], APP_INFO: ApplicationInfo): EnrollmentWithinViewAccessWindow[] => {
  const enrollmentsWithinViewAccessWindow: EnrollmentWithinViewAccessWindow[] = []

  for (const enrollment of studentEnrollments) {
    const periodDetails = getPeriodDetails(enrollment.period, APP_INFO)
    if (periodDetails.active || periodDetails.withinViewAccessWindow) {
      enrollmentsWithinViewAccessWindow.push({
        systemId: enrollment.systemId,
        source: enrollment.source,
        mainSchool: enrollment.mainSchool,
        school: enrollment.school,
        period: periodDetails,
        classMemberships: enrollment.classMemberships
          .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
          .filter((membership) => membership.period.active || membership.period.withinViewAccessWindow || membership.period.isNull), // Obs, klassemedlemskap har ingen periode. Vi antar at de er aktive innenfor et aktivt elevforhold
        contactTeacherGroupMemberships: enrollment.contactTeacherGroupMemberships
          .map((membership) => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) }))
          .filter((membership) => membership.period.active || membership.period.withinViewAccessWindow || membership.period.isNull), // Obs, kontaktlærergruppemedlemskap har ingen periode. Vi antar at de er aktive innenfor et aktivt elevforhold
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

export const getUniqueStudentEnrollmentTeachers = (studentEnrollments: StudentEnrollment[]): StudentEnrollment[] => {
  return studentEnrollments.map((studentEnrollment: StudentEnrollment) => {
    return {
      ...studentEnrollment,
      classMemberships: studentEnrollment.classMemberships.map((classMembership: ClassMembership) => {
        return {
          ...classMembership,
          classGroup: {
            ...classMembership.classGroup,
            teachers: classMembership.classGroup.teachers.filter((teacher: Teacher, index: number, self: Teacher[]) => index === self.findIndex((t: Teacher) => t.systemId === teacher.systemId))
          }
        }
      }),
      contactTeacherGroupMemberships: studentEnrollment.contactTeacherGroupMemberships.map((contactTeacherGroupMembership: ContactTeacherGroupMembership) => {
        return {
          ...contactTeacherGroupMembership,
          contactTeacherGroup: {
            ...contactTeacherGroupMembership.contactTeacherGroup,
            teachers: contactTeacherGroupMembership.contactTeacherGroup.teachers.filter(
              (teacher: Teacher, index: number, self: Teacher[]) => index === self.findIndex((t: Teacher) => t.systemId === teacher.systemId)
            )
          }
        }
      }),
      teachingGroupMemberships: studentEnrollment.teachingGroupMemberships.map((teachingGroupMembership: TeachingGroupMembership) => {
        return {
          ...teachingGroupMembership,
          teachingGroup: {
            ...teachingGroupMembership.teachingGroup,
            teachers: teachingGroupMembership.teachingGroup.teachers.filter(
              (teacher: Teacher, index: number, self: Teacher[]) => index === self.findIndex((t: Teacher) => t.systemId === teacher.systemId)
            )
          }
        }
      })
    }
  })
}
