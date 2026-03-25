import type { AccessEntry } from "$lib/types/app-types"

export const ACCESS_TYPE_DISPLAY_NAMES: Record<AccessEntry["type"], string> = {
  "AUTOMATISK-KLASSE-TILGANG": "Klasselærer (InSchool)",
  "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG": "Kontaktlærer (InSchool)",
  "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG": "Faglærer (InSchool)",
  "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG": "Opprett manuelle elever",
  "MANUELL-ELEV-TILGANG": "Manuell elevtilgang",
  "MANUELL-KLASSE-TILGANG": "Manuell klassetilgang",
  "MANUELL-SKOLELEDER-TILGANG": "Skoleleder",
  "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG": "Undervisningsområde"
}
