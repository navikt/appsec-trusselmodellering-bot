const buildAdminRequestMessage = (requestId, user, data) => ({
  text: `Ny pentest-forespørsel: ${data.projectName || 'Uten navn'}`,
  blocks: [
    { type: 'header', text: { type: 'plain_text', text: '🔒 Ny pentest-forespørsel', emoji: true } },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
        { type: 'mrkdwn', text: `*Forespurt av:*\n<@${user.id}>` }
      ]
    },
    { type: 'divider' },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*Prosjektnavn:*\n${data.projectName || 'Uten navn'}` },
        { type: 'mrkdwn', text: `*Testtype:*\n${data.pentestTypeText || 'Ikke oppgitt'}` },
        { type: 'mrkdwn', text: `*Hastegrad:*\n${data.urgencyText || 'Ikke oppgitt'}` }
      ]
    },
    { type: 'section', text: { type: 'mrkdwn', text: `*Testområde:*\n${data.targetScope || 'Ikke oppgitt'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Teammedlemmer:*\n${(data.teamMembers || []).map(id => `<@${id}>`).join(', ') || 'Ingen valgt'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Tilleggsinformasjon:*\n${data.additionalInfo || 'Ingen'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Fullstendig rapport:*\n${data.fullReport === 'yes' ? 'Ja' : data.fullReport === 'no' ? 'Nei' : 'Ikke oppgitt'}` } },
    { type: 'divider' },
    {
      type: 'actions', block_id: 'admin_actions', elements: [
        { type: 'button', text: { type: 'plain_text', text: '✅ Godkjenn', emoji: true }, style: 'primary', action_id: 'approve_request', value: requestId },
        { type: 'button', text: { type: 'plain_text', text: '❌ Avvis', emoji: true }, style: 'danger', action_id: 'reject_request', value: requestId },
        { type: 'button', text: { type: 'plain_text', text: '💬 Be om mer info', emoji: true }, action_id: 'request_info', value: requestId }
      ]
    }
  ]
});

const buildChannelWelcomeMessage = (requestId, request, approver, jiraUrl = null, checklistSelections = []) => {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `🔒 Pentest: ${request.projectName}`, emoji: true } },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
        { type: 'mrkdwn', text: `*Godkjent av:*\n<@${approver.id}>` },
        { type: 'mrkdwn', text: `*Testtype:*\n${request.pentestTypeText}` },
        { type: 'mrkdwn', text: `*Hastegrad:*\n${request.urgencyText}` }
      ]
    },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `*Testområde:*\n${request.targetScope}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Tilleggsinformasjon:*\n${request.additionalInfo || 'Ingen'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Fullstendig rapport:*\n${request.fullReport === 'yes' ? 'Ja' : request.fullReport === 'no' ? 'Nei' : 'Ikke oppgitt'}` } },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Sjekkliste for bestiller: Hva ønsker vi - og hva forventes?*  
Dette er en veiledende liste over hva som er nyttig å ha på plass før oppstart. Du trenger ikke ha alt klart nå - terskelen skal være lav. Det viktigste er at du bestiller og viser interesse; vi avklarer detaljer fortløpende her i kanalen.

• *Definer scope:* Tydelige URL-er, API-endepunkter, relevante miljøer (dev/test/staging/prod), hva som inngår/ikke inngår, og gjerne eksempler på viktige brukerreiser  
• *Tilganger / testbrukere / testdata:* Testkontoer (roller), API-nøkler/clients, ev. IP-whitelist/VPN, og hvordan dette utstedes  
• *Tidspunkt for test:* Ønsket tidsrom, blackout-perioder (kritiske leveranser, freeze), og relevante releaseplaner  
• *Kontaktpersoner:* Teknisk kontakt, produkt/PO, og ev. sikkerhetskontakt som kan svare raskt ved behov  
• *Spesielle hensyn:* Ytelse/driftsvindu, logging/varsling, DDoS-beskyttelse, datahåndtering eller andre praktiske forhold  
• *Ønsket leveranse:* Jira-saker, fullstendig rapport, demo/gjennomgang - si ifra hva som passer best

💬 Usikker på noe? Skriv kort hva det gjelder og hva du vet - så hjelper vi deg med resten.`
      }
    },
    {
      type: 'actions',
      block_id: `requester_checklist:${requestId}`,
      elements: [
        {
          type: 'checkboxes',
          action_id: 'requester_checklist',
          options: [
            { text: { type: 'plain_text', text: 'Definer scope' }, value: 'scope' },
            { text: { type: 'plain_text', text: 'Tilganger / testdata' }, value: 'access' },
            { text: { type: 'plain_text', text: 'Tidspunkt for test' }, value: 'timing' },
            { text: { type: 'plain_text', text: 'Kontaktpersoner' }, value: 'contacts' },
            { text: { type: 'plain_text', text: 'Spesielle hensyn' }, value: 'considerations' }
          ],
          ...(Array.isArray(checklistSelections) && checklistSelections.length
            ? {
              initial_options: checklistSelections.map((v) => ({
                text: { type: 'plain_text', text: v === 'scope' ? 'Definer scope' : v === 'access' ? 'Tilganger / testdata' : v === 'timing' ? 'Tidspunkt for test' : v === 'contacts' ? 'Kontaktpersoner' : 'Spesielle hensyn' },
                value: v
              }))
            }
            : {})
        }
      ]
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Sjekkliste: ${Array.isArray(checklistSelections) ? checklistSelections.length : 0}/5 fullført`
        }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Teammedlemmer:*\n${request.teamMembers.map(id => `<@${id}>`).join(', ') || 'Ingen valgt'}  
        
Velkommen! SåPe vil koordinere pentest-aktivitetene her i kanalen.`
      }
    },
    { type: 'divider' }
  ];

  if (jiraUrl) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*🎫 Jira-sak:*\n${jiraUrl}` }
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      { type: 'button', text: { type: 'plain_text', text: '📋 Oppdater status', emoji: true }, action_id: 'update_status', value: requestId },
      { type: 'button', text: { type: 'plain_text', text: '📄 Vis forespørselsdetaljer', emoji: true }, action_id: 'view_details', value: requestId }
    ]
  });

  return { text: `Velkommen til pentest-kanalen for ${request.projectName}`, blocks };
};

const buildApprovedMessage = (requestId, request, approver, channelId, jiraUrl = null) => {
  const fields = [
    { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
    { type: 'mrkdwn', text: `*Prosjekt:*\n${request.projectName}` },
    { type: 'mrkdwn', text: `*Godkjent av:*\n<@${approver.id}>` },
    { type: 'mrkdwn', text: `*Kanal:*\n<#${channelId}>` }
  ];

  if (jiraUrl) fields.push({ type: 'mrkdwn', text: `*Jira-sak:*\n${jiraUrl}` });

  return {
    text: `Pentest-forespørsel godkjent: ${request.projectName}`,
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: '✅ Pentest-forespørsel godkjent', emoji: true } },
      { type: 'section', fields }
    ]
  };
};

const buildRejectedMessage = (requestId, request, rejector, reason) => ({
  text: `Pentest-forespørsel avvist: ${request.projectName}`,
  blocks: [
    { type: 'header', text: { type: 'plain_text', text: '❌ Pentest-forespørsel avvist', emoji: true } },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
        { type: 'mrkdwn', text: `*Prosjekt:*\n${request.projectName}` },
        { type: 'mrkdwn', text: `*Avvist av:*\n<@${rejector.id}>` }
      ]
    },
    { type: 'section', text: { type: 'mrkdwn', text: `*Begrunnelse for avvisning:*\n${reason}` } }
  ]
});

function buildAppHomeView(userId, myRequests = []) {
  const introBlocks = [
    { type: 'header', text: { type: 'plain_text', text: '🔒 SåPe - Pentest bestilling', emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hei <@${userId}>! Her kan du bestille pentest. Klikk på knappen under for å starte en ny forespørsel.`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'request_pentest',
          style: 'primary',
          text: { type: 'plain_text', text: 'Bestill pentest', emoji: true },
          value: 'open_pentest_modal'
        }
      ]
    },
    { type: 'divider' }
  ];

  const tipsBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Bestill pentest*

*Målet er lav terskel: det viktigste er å melde fra om et behov, så tar vi dialogen sammen etterpå.* Du trenger ikke ha alle detaljer klare for å sende inn en forespørsel.

*Hva skjer når du bestiller?*
1.  Du fyller ut det du vet i skjemaet.
2.  Vi oppretter en privat Slack-kanal og en Jira-sak for dialog og oppfølging.
3.  Sammen avklarer vi omfang, planlegger testen og finner et tidspunkt som passer.

*For å gjøre prosessen enda smidigere, er det supert om du har tenkt på:*
•   *Hva skal testes?* (F.eks. en nettside, et API, en app)
•   *Tilganger:* Trenger vi testbrukere eller spesielle tilganger? (Ikke del passord i bestillingen!)
•   *Kontaktpersoner:* Hvem fra ditt team kan vi kontakte ved behov?

Igjen, ingenting av dette er et krav for å starte. Send inn det du har, selv om det bare er en idé. Vi er her for å hjelpe!

*Viktig: Ikke del sensitiv informasjon*
Husk at du ikke skal dele konfidensiell eller taushetsbelagt informasjon i Slack. For dette bruker vi andre fagsystemer. Les mer i <https://navno.sharepoint.com/sites/intranett-it/SitePages/Slik-bruker-vi-Slack-i-Nav.aspx|retningslinjene for bruk av Slack>.

For støtte, kontakt #team-sårbarhetsstyring-og-penetrasjonstesting.`
    }
  };

  return {
    type: 'home',
    blocks: [...introBlocks, tipsBlock]
  };
}

module.exports = {
  buildAdminRequestMessage,
  buildChannelWelcomeMessage,
  buildApprovedMessage,
  buildRejectedMessage,
  buildAppHomeView
};