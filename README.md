# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## SEtup
MOCK_AUTH="true"
MOCK_AUTH_ROLES="Hva som helst"
MOCK_DB="true"


## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

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
  - Se alle notater?

### Klassenotat


### Tror ikke det trengs et og et notat - trengs heller en tråd - som kan følges opp med kommentarer

