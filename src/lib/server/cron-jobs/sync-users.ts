/*
Må hente alle brukere som har tilgang via enterprise appen
- Hente alle brukere fra EntraID som har tilgang til appen
- Sjekke om brukeren finnes i vår database
- Hvis ikke, opprette brukeren med info fra EntraID
- Hvis ja, oppdatere infoen hvis den har endret seg (f.eks. navn, epost, grupper, roller)

Kjøres f.eks. hver natt som en cron-jobb
*/