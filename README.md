# Elevoppfølging

## Setup

Create a `.env` file in the root of the project with the following content:

```env
MOCK_AUTH="true" # Set to "true" to enable mock authentication, which allows you to simulate different user roles and permissions without needing a real authentication system.
MOCK_AUTH_ROLES="admin,metrics" # A comma-separated list of roles to assign to the mock user. This allows you to test different access levels and permissions in your application.
MOCK_AUTH_ENTRA_OBJECT_ID="00000000-0000-0000-0000-000000000000" # A placeholder Entra Object ID for the mock user, which can be used to simulate user-specific data and permissions in your application.
MOCK_SSN_CHECK="true" # Set to "true" to enable mock Social Security Number (SSN) checks, which can be useful for testing features that require SSN validation without needing real SSNs.
MONGODB_CONNECTION_STRING="mongodb+srv://<username>:<password>@<server>/?appName=elevoppfolging"
MONGODB_DATABASE_NAME="elevoppfolging"
AZURE_CLIENT_ID="00000000-0000-0000-0000-000000000000" # Used for client-side encryption and decryption of sensitive data in MongoDB
AZURE_CLIENT_SECRET="your-azure-client-secret" # Used for client-side encryption and decryption of sensitive data in MongoDB
AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000" # Used for client-side encryption and decryption of sensitive data in MongoDB
WEB_APP_URL="http://localhost:5173" # The URL where your SvelteKit app will be running, used in email alerts to provide deep links back to the app
DOCUMENT_LOCK_START_MM_DD="07-01" # Optional. The start date (month and day) for the document lock period, decides when the school year starts/ends. If not set, document lock will be disabled.
STUDENT_OVERVIEW_TOP="100" # Optional. The number of students to show in the student overview page. If not set, it defaults to 100.
```

### Document lock

Document lock is a feature that prevents editing / commenting on / deleting a document when the school year is over. The school year is defined as starting on `DOCUMENT_LOCK_START_MM_DD` and ending one year later.
If `DOCUMENT_LOCK_START_MM_DD` is set to `07-01`, the school year starts on July 1st and ends on June 30th of the following year.

Examples:
- if a document is created on 30th June 2024, it will be locked for editing/commenting/deletion starting from 1st July 2024.
- if a document is created on 5th August 2024, it will be locked for editing/commenting/deletion starting from 1st July 2025.

A locked document can still be viewed, but not edited, commented on or deleted. A locked document will have a lock icon next to the title and a tooltip that states why the document is locked.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.


# Møte
## Tilgangsstyring
- Kontaktlærer
- Faglærer
- Avdelingsleder / rådgiver har samme tilgang over hele røkla
  - Klasser
- Rektor
  - Alle elever på hele skolen
- Elevtjenesten / mulighetssenter
  - Alle elever på skolen
- Rådgiver
- 

### Tilgang på elever (hva kan man se)
- Auto (klasser, undervisningsgrupper, kontaktlærergrupper)
- Enkeltelev
- Undervisningsgruppe
- Kontaktlærergruppe
- Klasse
- Område (et utvalg klasser)
- Skole

### Tilgang på se og gjøre inne på en elev
- Faglærer (fra undervisningsgruppe)
  - Lese og lage vanlige notater
- Kontaktlærer
  - Se alle notater? Kanskje?

### Klassenotat


### Tror ikke det trengs et og et notat - trengs heller en tråd - som kan følges opp med kommentarer

