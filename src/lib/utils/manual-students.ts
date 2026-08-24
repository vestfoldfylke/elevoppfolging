import type { Period, School, StudentEnrollment } from "$lib/types/db/shared-types.js"
import { generateUUID } from "$lib/utils/uuid.js"

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
