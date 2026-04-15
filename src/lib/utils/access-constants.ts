import type { AccessEntry } from "$lib/types/app-types"

export const ACCESS_TYPE_DISPLAY_NAMES: Record<AccessEntry["type"], string> = {
  "AUTOMATISK-KLASSE-TILGANG": "Klasselærer (InSchool) for",
  "AUTOMATISK-KONTAKTLÆRERGRUPPE-TILGANG": "Kontaktlærer (InSchool) for",
  "AUTOMATISK-UNDERVISNINGSGRUPPE-TILGANG": "Faglærer (InSchool) for",
  "MANUELL-OPPRETT-MANUELL-ELEV-TILGANG": "Opprett manuelle elever",
  "MANUELL-ELEV-TILGANG": "Rådgiver for enkeltelev",
  "MANUELL-KLASSE-TILGANG": "Rådgiver for klasse",
  "MANUELL-SKOLELEDER-TILGANG": "Skoleleder",
  "MANUELL-UNDERVISNINGSOMRÅDE-TILGANG": "Rådgiver for undervisningsområde"
}
