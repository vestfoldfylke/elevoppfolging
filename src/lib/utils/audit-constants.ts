import type { AuditEntry, ConstantDisplayNameEntry } from "$lib/types/db/shared-types"
import { STUDENT_CHECKBOX_DISPLAY_NAMES } from "$lib/utils/student-checkbox-constants"

const followUpDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.single?.toLowerCase() || STUDENT_CHECKBOX_DISPLAY_NAMES.FOLLOW_UP.plural.toLowerCase()
const facilitationDisplayName: string = STUDENT_CHECKBOX_DISPLAY_NAMES.FACILITATION.plural.toLowerCase()

export const AUDIT_ENTRY_ACTION_DISPLAY_NAMES: Record<AuditEntry["action"], string> = {
  OPEN: "Åpnet / Vist / Lest",
  CREATE: "Opprettet",
  UPDATE: "Endret",
  DELETE: "Slettet"
}

export const AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES: Record<AuditEntry["resource"], ConstantDisplayNameEntry> = {
  Access: {
    plural: "Tilgang"
  },
  EmailAlert: {
    plural: "Epostvarsel"
  },
  GroupDocument: {
    plural: "Klassenotater",
    single: "Klassenotat"
  },
  GroupDocumentMessage: {
    plural: "Oppdatering klassenotater",
    single: "Oppdatering klassenotat"
  },
  ImportantStuff: {
    plural: "Viktig informasjon"
  },
  ManualUser: {
    plural: "Manuelle brukere",
    single: "Manuell bruker"
  },
  ProgramArea: {
    plural: "Gruppering av klasser"
  },
  School: {
    plural: "Skoler",
    single: "Skole"
  },
  Student: {
    plural: "Elever",
    single: "Elev"
  },
  StudentCheckBox: {
    plural: `Avkrysningsbokser ${followUpDisplayName} og ${facilitationDisplayName}`,
    single: `Avkrysningsboks ${followUpDisplayName} og ${facilitationDisplayName}`
  },
  StudentDataSharingConsent: {
    plural: "Samtykke til deling av data"
  },
  StudentDocument: {
    plural: "Elevnotater",
    single: "Elevnotat"
  },
  StudentDocumentMessage: {
    plural: "Oppdatering elevnotater",
    single: "Oppdatering elevnotat"
  },
  Template: {
    plural: "Maler",
    single: "Mal"
  }
}
