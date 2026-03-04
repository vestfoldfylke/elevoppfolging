import type { ApplicationInfo, FrontendOverviewStudent, FrontendStudent, FrontendStudentDetails } from "$lib/types/app-types";
import type { SchoolInfo } from "$lib/types/db/shared-types";
import { getPeriodDetails } from "./period";

export const getFrontendStudentDetails = (student: FrontendStudent | FrontendOverviewStudent, APP_INFO: ApplicationInfo): FrontendStudentDetails => {
  const mainSchool = student.mainEnrollment?.school
  const mainClassMembership = student.mainEnrollment?.classMemberships.map(membership => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) })).find(membership => membership.period.active || membership.period.withinViewAccessWindow)
  const mainContactTeacherGroupMembership = student.mainEnrollment?.contactTeacherGroupMemberships.map(membership => ({ ...membership, period: getPeriodDetails(membership.period, APP_INFO) })).find(membership => membership.period.active || membership.period.withinViewAccessWindow)
  const additionalSchools: SchoolInfo[] = []
  if ("studentEnrollments" in student) {
    for (const enrollment of student.studentEnrollments || []) {
      if (enrollment.school.schoolNumber === mainSchool?.schoolNumber) {
        continue
      }
      const enrollmentPeriod = getPeriodDetails(enrollment.period, APP_INFO)
      if (!enrollmentPeriod.active && !enrollmentPeriod.withinViewAccessWindow) {
        continue
      }
      if (!additionalSchools.some(school => school.schoolNumber === enrollment.school.schoolNumber)) {
        additionalSchools.push(enrollment.school)
      }
    }
  }

  return { 
    mainSchool: mainSchool || null,
    mainClassMembership: mainClassMembership || null,
    mainContactTeacherGroupMembership: mainContactTeacherGroupMembership || null,
    additionalSchools
   }
}