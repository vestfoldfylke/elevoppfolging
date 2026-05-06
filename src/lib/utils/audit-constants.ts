import type { AuditEntry, AuditEntryResourceDisplayNameEntry } from "$lib/types/db/shared-types"

export const AUDIT_ENTRY_ACTION_DISPLAY_NAMES: Record<AuditEntry["action"], string> = {
  OPEN: "Åpnet / Vist / Lest",
  CREATE: "Opprettet",
  UPDATE: "Endret",
  DELETE: "Slettet"
}

export const AUDIT_ENTRY_RESOURCE_DISPLAY_NAMES: Record<AuditEntry["resource"], AuditEntryResourceDisplayNameEntry> = {
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
    plural: "Oppfølging klassenotater",
    single: "Oppfølging klassenotat"
  },
  ImportantStuff: {
    plural: "Viktig informasjon"
  },
  ManualUser: {
    plural: "Manuelle brukere",
    single: "Manuell bruker"
  },
  ProgramArea: {
    plural: "Programområder",
    single: "Programområde"
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
    plural: "Avkrysningsbokser oppfølging og enkeltvedtak",
    single: "Avkrysningsboks oppfølging og enkeltvedtak"
  },
  StudentDataSharingConsent: {
    plural: "Samtykke til deling av data"
  },
  StudentDocument: {
    plural: "Elevnotater",
    single: "Elevnotat"
  },
  StudentDocumentMessage: {
    plural: "Oppfølging elevnotater",
    single: "Oppfølging elevnotat"
  },
  Template: {
    plural: "Maler",
    single: "Mal"
  }
}
