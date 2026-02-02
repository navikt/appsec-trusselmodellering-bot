# AppSec Trusselmodellering Bot

Slack-bot for å håndtere bestillinger av trusselmodellering med automatisk integrasjon til Trello.

Denne appen er en Slack-bot som gjør det enkelt for team i NAV å bestille trusselmodellering. Når en forespørsel sendes inn, opprettes det automatisk et Trello-kort for oppfølging, og AppSec-teamet blir varslet i en dedikert Slack-kanal.

## Funksjonalitet

- **Slack-kommando**: `/bestill-trusselmodellering` for å åpne et bestillingsskjema
- **App Home**: Dedikert hjemmeside i Slack med mulighet til å starte nye forespørsler
- **Automatisk Trello-integrasjon**: Oppretter automatisk Trello-kort når en forespørsel sendes inn
- **Varsling**: Poster varsler til en dedikert Slack-kanal når nye forespørsler kommer inn
- **Database**: Persistent lagring av forespørsler i PostgreSQL

## Komme i gang

### Forutsetninger

- Node.js 22 eller nyere
- PostgreSQL database
- Slack Workspace med admin-tilgang for å opprette Slack-apper
- Trello-konto med API-tilgang

### Lokalt oppsett

1. Klon repositoryet:
```bash
git clone https://github.com/navikt/appsec-trusselmodellering-bot.git
cd appsec-trusselmodellering-bot
```

2. Installer avhengigheter:
```bash
npm install
```

3. Opprett en `.env`-fil med nødvendige miljøvariabler:
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SIGNING_SECRET=your-signing-secret
SOCKET_MODE_TOKEN=xapp-your-socket-mode-token
NOTIFICATION_CHANNEL_ID=C1234567890
TRELLO_API_KEY=your-trello-api-key
TRELLO_API_TOKEN=your-trello-token
TRELLO_LIST_ID=your-trello-list-id
PORT=3000
```

4. Start applikasjonen lokalt:
```bash
npm start
```

For utvikling med automatisk restart:
```bash
npm run dev
```

### Bygging og testing

Applikasjonen bygges og kjøres via Docker for produksjonsmiljø. Se `Dockerfile` for detaljer.

### Deploy til NAIS

Applikasjonen deployes automatisk til NAIS-plattformen. Konfigurasjon finnes i `.nais/nais.yaml`.

## Arkitektur

- **Framework**: Slack Bolt for JavaScript
- **Database**: PostgreSQL for persistent lagring
- **Integrasjoner**: Slack API og Trello API
- **Deployment**: NAIS (Kubernetes)

---

## Henvendelser

Spørsmål knyttet til koden eller repositoryet kan stilles som issues her på GitHub.

### For Nav-ansatte

Interne henvendelser kan sendes via Slack i kanalen **#appsec**.
