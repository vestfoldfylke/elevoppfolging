import type { RequestHandler } from "@sveltejs/kit"
import { logger } from "@vestfoldfylke/loglady"
import { getPrincipalAccess } from "$lib/server/authorization/principal-access"
import { upsertStudentInCache } from "$lib/server/cache/students-cache"
import { getDbClient } from "$lib/server/db/get-db-client"
import { HTTPError } from "$lib/server/middleware/http-error"
import { apiRequestMiddleware } from "$lib/server/middleware/http-request"
import { canManageManualStudentsOnSchool, isSchoolLeaderForSchool, noAccessMessage } from "$lib/shared-authorization/authorization"
import type { ApiRouteMap, NoSlashString } from "$lib/types/api/api-route-map"
import type { FrontendStudent, PrincipalAccess } from "$lib/types/app-types"
import type { IDbClient } from "$lib/types/db/db-client"
import type { AppStudent, ClassMembership, ContactTeacherGroupMembership, EditorData, StudentEnrollment, TeachingGroupMembership, UpdateAppStudent } from "$lib/types/db/shared-types"
import type { ApiNextFunction } from "$lib/types/middleware/http-request"
import { isActive } from "$lib/utils/period"

type RemoveEnrollmentResponse = ApiRouteMap[`/api/students/${NoSlashString}/enrollments/${NoSlashString}`]["DELETE"]["res"]

const removeEnrollment: ApiNextFunction<RemoveEnrollmentResponse> = async ({ principal, requestEvent }) => {
  const studentId: string | undefined = requestEvent.params.student_id
  if (!studentId) {
    throw new HTTPError(400, "Student ID is missing in request parameters")
  }

  const enrollmentId: string | undefined = requestEvent.params.enrollment_id
  if (!enrollmentId) {
    throw new HTTPError(400, "Enrollment ID is missing in request parameters")
  }

  const dbClient: IDbClient = getDbClient()

  const student: AppStudent | null = await dbClient.students.getStudentById(studentId)
  if (!student) {
    throw new HTTPError(404, "Student not found. Cannot delete studentEnrollment for non-existing student.")
  }

  const studentEnrollment: StudentEnrollment | undefined = student.studentEnrollments.find((enrollment: StudentEnrollment) => enrollment.systemId === enrollmentId)
  if (!studentEnrollment) {
    throw new HTTPError(404, "Enrollment not found. Cannot delete non-existing student enrollment.")
  }

  if (studentEnrollment.source !== "MANUAL") {
    throw new HTTPError(403, "Cannot delete student enrollment registered in source system")
  }

  const principalAccess: PrincipalAccess | null = await getPrincipalAccess(principal.id)
  if (!principalAccess) {
    throw new HTTPError(403, noAccessMessage("No access found for principal"))
  }

  if (!isSchoolLeaderForSchool(principalAccess, studentEnrollment.school.schoolNumber) || !canManageManualStudentsOnSchool(principalAccess, studentEnrollment.school.schoolNumber)) {
    throw new HTTPError(403, noAccessMessage("No permission to delete this student enrollment"))
  }

  const editorData: EditorData = {
    by: {
      entraUserId: principal.id,
      fallbackName: principal.displayName
    },
    at: new Date()
  }

  let mainSchoolChanged: boolean = false

  const updateAppStudent: UpdateAppStudent = {
    ...student,
    modified: editorData,
    studentEnrollments: student.studentEnrollments.map((enrollment: StudentEnrollment) => {
      if (enrollment.systemId !== studentEnrollment.systemId) {
        if (mainSchoolChanged || !isActive(enrollment.period)) {
          return enrollment
        }

        mainSchoolChanged = true
        return {
          ...enrollment,
          mainSchool: true
        }
      }

      return {
        ...enrollment,
        mainSchool: student.studentEnrollments.length === 1,
        period: {
          ...enrollment.period,
          end: new Date() // Set end date to now which indicates the enrollment is removed, but keep the enrollment record for historical/audit purposes
        },
        classMemberships: enrollment.classMemberships.map((classMembership: ClassMembership) => ({
          ...classMembership,
          period: {
            ...classMembership.period,
            end: new Date()
          }
        })),
        teachingGroupMemberships: enrollment.teachingGroupMemberships.map((teachingGroupMembership: TeachingGroupMembership) => ({
          ...teachingGroupMembership,
          period: {
            ...teachingGroupMembership.period,
            end: new Date()
          }
        })),
        contactTeacherGroupMemberships: enrollment.contactTeacherGroupMemberships.map((contactTeacherGroupMembership: ContactTeacherGroupMembership) => ({
          ...contactTeacherGroupMembership,
          period: {
            ...contactTeacherGroupMembership.period,
            end: new Date()
          }
        }))
      }
    })
  }

  try {
    await dbClient.students.updateStudent(updateAppStudent)
    logger.info(
      "Student enrollment with StudentEnrollmentSystemId {StudentEnrollmentSystemId} removed successfully from student with StudentId {StudentId} by PrincipalId {PrincipalId}",
      studentEnrollment.systemId,
      student._id,
      principal.id
    )
  } catch (error) {
    throw new HTTPError(500, "Feilet ved sletting av elevforhold", error)
  }

  const frontendStudent: FrontendStudent = {
    _id: studentId,
    systemId: updateAppStudent.systemId,
    studentNumber: updateAppStudent.studentNumber,
    feideName: updateAppStudent.feideName,
    name: updateAppStudent.name,
    source: updateAppStudent.source,
    studentEnrollments: updateAppStudent.studentEnrollments,
    created: updateAppStudent.created,
    modified: updateAppStudent.modified,
    hasBlockedAddress: updateAppStudent.hasBlockedAddress ?? false
  }

  await upsertStudentInCache(frontendStudent)

  try {
    const studentName: string = student.name

    await dbClient.auditLogs.createAuditEntry({
      created: {
        by: {
          entraUserId: principal.id,
          fallbackName: principal.displayName
        },
        at: new Date()
      },
      action: "DELETE",
      resource: "StudentEnrollment",
      resourceId: studentEnrollment.systemId,
      resourceName: "",
      metaData: {
        data: JSON.stringify({
          studentName
        }),
        parentResource: "Student",
        parentResourceId: studentId,
        schoolId: studentEnrollment.school.schoolNumber
      }
    })
  } catch (error) {
    logger.errorException(error, "Failed to create audit entry when removing StudentEnrollmentSystemId {StudentEnrollmentSystemId}", studentEnrollment.systemId)
  }

  return {
    enrollmentId: studentEnrollment.systemId
  }
}

export const DELETE: RequestHandler = async (requestEvent) => {
  return apiRequestMiddleware<RemoveEnrollmentResponse>(requestEvent, removeEnrollment)
}
