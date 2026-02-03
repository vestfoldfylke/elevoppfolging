Hvis vi lager egen database over elever

collections:
elever
  elev
    _id
    personinfo
    elevforhold[]
      skole
      basisgruppe[]
        lærere og kontaktlærere (sleng på bruker _id på lærerne)
      undervisningsgruppe[]
        lærere

brukere
  _id
  entraId-id
  feidenavn (hvis de har)
  company
  department

tilganger
    id: hvem har tilgang
    navn: haha
    skolelederfor[skolenummer]
    avdelingslederfor[{skolenummer, undervisningsområder}]
    basisgrupper[{skolenummer, system_id}]
    elev_id[{skoleummer, db_elev_id}]

undervisningsområder
  _id
  basisgrupper[]

viktiginfo
  id
  info

checkboxene
  id
  fhduifhduf
  jfdsjfd
  sdfklj

notater
  elev_id (intern db id)
  skolenummer
  type: notat
  synligFor: noen
  title: ***
  data: ***


Entra-roller
  - Bruker
  - Systemadmin
    
    

Skoleleder må sitte og si at denne er avedlingsleder blbalabala. 
Sysadmin må sitte og si at disse er skoleleder ved denne skolen balbalab


Per Lærer logger på med Entra - da får vi upn og id - det må hentes evt en kobling mot fint som jeg mener kan være feidenavnet basert på samaccounten, muuuuligens ansattnr som ligger i extatt
- slå opp i db på entra-objekt-iden til innlogget bruker også er det good

elever.find(elev => elev.basisgrupper or undervisninsgrupper.some(teacher => teacher.id === ==== currentTeacher.id))


Trynefjert Rådgiver - logger på, vi får en entra-id-id, skal hente alle elever hen har tilgang på. Rollestyrt og noen har da gitt tilgang til basisklasser eller direkte på elev.

find(elev: basisgruppe in elev.basisgrupper)


Frrank skoleleder skal gi tilganger. Hent alle basisgrupper som tilhører skolen

elever.find(elev => elev.skole) => hent unike basisgrupper


Frank skoleleder skal gi tilgang til en avdelingsleder
Må frank først opprette en "gruppe" i vår db som inneholder flere basisgrupper da?

Enten gi hver eneste avdelingsleder tilgang til spesfikke basisgrupper, eller først "lage" en avdeling og deretter gi tilgang

Syvertsen avdelingsleder hun logger på og skal ha alle elevene sine
- Ser at det er rollen avdelingsleder
elever.find(elev => skole && some undervisningsområde.basisgruppe => inn elevens basisgrupper)

elev
_id
når vi skal oppdatere eleven matcher vi på elevnummer

Hvis noen har byttet elevnummer - så kan vi kjøre et api-kall som bytter elevnummer, og setter korrekt id på alle oppføringer i db.@


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
