import { getDbClient } from "$lib/server/db/get-db-client.js"
import { HTTPError } from "$lib/server/middleware/http-error.js"
import { type AuthorizationResult, authorizeManageManualStudentsOnSchool } from "$lib/shared-authorization/authorization.js"
import type { FrontendStudent, ManualStudentCreateOrReactivate } from "$lib/types/app-types.js"
import type { AuthenticatedPrincipal } from "$lib/types/authentication.js"
import type { IDbClient } from "$lib/types/db/db-client.js"
import type { Access, Period, School, StudentEnrollment } from "$lib/types/db/shared-types.js"
import { isActive } from "$lib/utils/period.js"
import { generateUUID } from "$lib/utils/uuid.js"

export const canCreateOrReactivateManualStudent = async (manualStudentSsn: string, schoolNumber: string, principal: AuthenticatedPrincipal): Promise<ManualStudentCreateOrReactivate> => {
  // authorization check if principal has access to the student or group
  const dbClient: IDbClient = getDbClient()

  const access: Access | null = await dbClient.access.getPrincipalAccess(principal.id)
  if (!access) {
    throw new HTTPError(403, "Ingen tilgang funnet for bruker")
  }

  const authorizationResult: AuthorizationResult = authorizeManageManualStudentsOnSchool({ principalAccess: access, schoolNumber })
  if (!authorizationResult.authorized) {
    throw new HTTPError(403, authorizationResult.message)
  }

  const schools: School[] = await dbClient.schools.getSchools()
  const schoolRecord: School | undefined = schools.find((school: School) => school.schoolNumber === schoolNumber)
  if (!schoolRecord) {
    throw new HTTPError(400, "Den angitte skolen eksisterer ikke")
  }

  const student: FrontendStudent | null = await dbClient.students.getStudentBySsn(manualStudentSsn)
  if (!student) {
    return {
      student,
      type: "CREATE",
      allowed: true
    }
  }

  const activeEnrollments: StudentEnrollment[] = student.studentEnrollments.filter((enrollment: StudentEnrollment) => isActive(enrollment.period)) ?? []
  let enrollmentMessage: string = `Elev med navn '${student.name}'`

  if (activeEnrollments.length === 0) {
    enrollmentMessage += " har ingen aktive elevforhold."
  } else if (activeEnrollments.length === 1) {
    enrollmentMessage += ` har ett aktivt elevforhold ved ${activeEnrollments[0].school.name}.`
  } else {
    enrollmentMessage += ` har aktivt elevforhold ved ${activeEnrollments.length} skoler: ${activeEnrollments.map((enrollment: StudentEnrollment) => enrollment.school.name).join(", ")}.`
  }

  if (schoolRecord.source === "MANUAL") {
    return {
      student,
      type: activeEnrollments.length === 0 ? "REACTIVATE" : "ADD_MANUAL_ENROLLMENT",
      allowed: activeEnrollments.filter((enrollment: StudentEnrollment) => enrollment.school.schoolNumber === schoolNumber).length === 0,
      message: enrollmentMessage
    }
  }

  return {
    student,
    type: activeEnrollments.length === 0 ? "REACTIVATE" : "ADD_MANUAL_ENROLLMENT",
    allowed: activeEnrollments.length === 0,
    message: enrollmentMessage
  }
}

export const generateManualStudentEnrollment = (school: School, mainSchool: boolean): StudentEnrollment => {
  const period: Period = {
    start: new Date(),
    end: null
  }

  return {
    source: "MANUAL",
    systemId: generateUUID("MANUAL"),
    period,
    school: {
      schoolNumber: school.schoolNumber,
      name: school.name
    },
    mainSchool,
    classMemberships: [
      {
        classGroup: {
          source: "MANUAL",
          name: `Manuelle elever på ${school.name}`,
          systemId: `MANUELLE-ELEVER-${school.name}`,
          teachers: []
        },
        period,
        systemId: generateUUID("MANUAL")
      }
    ],
    contactTeacherGroupMemberships: [],
    teachingGroupMemberships: []
  }
}
