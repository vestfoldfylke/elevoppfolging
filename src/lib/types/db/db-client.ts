import type { AppStudent } from "$lib/types/student"

export type Access = {
  _id: string
  userId: string
  name: string
  classes: AccessEntry[]
  teachingGroup: AccessEntry[]
  students: AccessEntry[]
}

export type AccessEntry = {
  resourceId: string
  schoolNumber: string
  source: "FINT" | "DIREKTE" | "UNDERVISNINGSOMRÅDE" | "SKOLELEDER"
}

export type AppUser = {
  _id: string
  feidenavn?: string
  entra: {
    id: string
    userPrincipalName: string
    displayName: string
    companyName: string
    department: string
  }
}

export interface IDbClient {
  getStudents: () => Promise<AppStudent[]>
  replaceStudents: (students: AppStudent[]) => Promise<void>
  replaceUsers: (users: AppUser[]) => Promise<void>
}


/*
* students/ (GET)
*   - Hente pålogget bruker (objectId)
*   - Hente access for pålogget bruker (objectId === userId)
*   - Hente alle elever basert på access for pålogget bruker
*       { elevforhold.basisgruppe.systemId.identifikatorverdi IN access.classes.resourceId OR elevforhold.teachingRelation.systemId IN access.teachingGroup.resourceId OR elevforhold._id IN access.students.resourceId }
*  - Returnere elever
* 
* getStudents/id/ (GET)
*  - Hente pålogget bruker
*  - Hente access for pålogget bruker
*  - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
*  - Hvis ja, returnere elev med hvem som kan oppfølge denne
*  - Hvis nei, returnere 403
* 
* getStudents/id/note (GET)
*  - Hente pålogget bruker
*  - Hente access for pålogget bruker
*  - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
*  - Hente notater som lærer har tilgang til (author eller en annen rolle enn lærer)
*  - Returnere notater (kun tittel)
* 
* getStudents/id/note/id (GET / POST / DELETE)
*   - GET
*     - Hente pålogget bruker
*     - Hente access for pålogget bruker
*     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
*     - Hente notat basert på id (sjekke at pålogget bruker er author eller har en annen rolle enn lærer)
*     - Returnere notat (tittel og innhold)
*   - POST
*     - Hente pålogget bruker
*     - Hente access for pålogget bruker
*     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
*     - Opprette notat
*       - Sette pålogget bruker som author
*       - Eventuelt om det er låst for innsyn av andre lærere
*   - DELETE
*     - Hente pålogget bruker
*     - Hente access for pålogget bruker
*     - Sjekke om pålogget bruker har tilgang til elev enten via klasse, undervisningsgruppe eller direkte
*     - Sjekke at pålogget brukers rolle har tilgang til å slette notatet
*     - Slette notat
* 
* - Skal vi ha en slett alle notater for en elev? for en skole?
* */
