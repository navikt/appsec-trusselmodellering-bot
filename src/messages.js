const buildThreatModelingNotificationMessage = (requestId, user, requestData, trelloUrl = null) => ({
  text: `Ny trusselmodellering-forespørsel: ${requestData.projectName || 'Uten navn'}`,
  blocks: [
    { type: 'header', text: { type: 'plain_text', text: '🛡️ Ny trusselmodellering-forespørsel', emoji: true } },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*Forespørsels-ID:*\n${requestId}` },
        { type: 'mrkdwn', text: `*Forespurt av:*\n<@${user.id}>` }
      ]
    },
    { type: 'divider' },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*System/applikasjon:*\n${requestData.projectName || 'Uten navn'}` },
        { type: 'mrkdwn', text: `*Team:*\n${requestData.teamName || 'Ikke oppgitt'}` },
        { type: 'mrkdwn', text: `*Formål:*\n${requestData.threatModelingReasonText || 'Ikke oppgitt'}` }
      ]
    },
    { type: 'section', text: { type: 'mrkdwn', text: `*Systembeskrivelse:*\n${requestData.systemDescription || 'Ikke oppgitt'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Ønsket tidsperiode:*\n${requestData.preferredTimeframe || 'Ikke oppgitt'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Tilleggsinformasjon:*\n${requestData.additionalInfo || 'Ingen'}` } },
    ...(trelloUrl ? [
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: `*Trello-kort:*\n<${trelloUrl}|Se Trello-kort for oppfølging>` } }
    ] : [])
  ]
});

function buildAppHomeView(userId, myRequests = []) {
  const introBlocks = [
    { type: 'header', text: { type: 'plain_text', text: '🛡️ Trusselmodellering', emoji: true } },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `Hei <@${userId}>! Her kan du bestille trusselmodellering. Klikk på knappen under for å starte en ny forespørsel.`
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'request_threatmodeling',
          style: 'primary',
          text: { type: 'plain_text', text: 'Bestill trusselmodellering', emoji: true },
          value: 'open_threatmodeling_modal'
        }
      ]
    },
    { type: 'divider' }
  ];

  const tipsBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Bestill trusselmodellering*

*Målet er lav terskel: det viktigste er å melde fra om et behov, så tar vi dialogen sammen etterpå.* Du trenger ikke ha alle detaljer klare for å sende inn en forespørsel.

*Hva skjer når du bestiller?*
1. Du fyller ut det du vet i skjemaet
2. Vi oppretter automatisk en Trello-sak for oppfølging
3. Sikkerhetsteamet blir varslet og tar kontakt for å avtale tidspunkt
4. Vi ønsker at hele teamet deltar i trusselmodelleringen, ikke bare utviklere

*For å gjøre prosessen enda smidigere, er det supert om du har tenkt på:*
• *Hva skal modelleres?* (F.eks. et system, en applikasjon, en tjeneste)
• *Systemets formål:* Hva gjør systemet og hvilke data håndteres?
• *Teamets kapasitet:* Når passer det best for teamet å gjennomføre trusselmodelleringen?

Igjen, ingenting av dette er et krav for å starte. Send inn det du har, selv om det bare er en idé. Vi er her for å hjelpe!

*Viktig: Ikke del sensitiv informasjon*
Husk at du ikke skal dele konfidensiell eller taushetsbelagt informasjon i Slack. For dette bruker vi andre fagsystemer.

For støtte, kontakt sikkerhetsteamet.`
    }
  };

  return {
    type: 'home',
    blocks: [...introBlocks, tipsBlock]
  };
}

module.exports = {
  buildThreatModelingNotificationMessage,
  buildAppHomeView
};