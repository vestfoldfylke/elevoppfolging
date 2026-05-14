import type { ConstantDisplayNameEntry, StudentCheckBoxInput } from "$lib/types/db/shared-types"

export const STUDENT_CHECKBOX_DISPLAY_NAMES: Record<StudentCheckBoxInput["type"], ConstantDisplayNameEntry> = {
  FACILITATION: {
    plural: "Enkeltvedtak"
  },
  FOLLOW_UP: {
    plural: "Oppfølginger",
    single: "Oppfølging"
  }
}
