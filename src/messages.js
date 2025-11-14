const buildThreatModelingNotificationMessage = (requestId, user, requestData, trelloUrl = null) => ({
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
        { type: 'mrkdwn', text: `*Team:*\n${requestData.teamName || 'Ikke oppgitt'}` }
      ]
    },
    { type: 'section', text: { type: 'mrkdwn', text: `*Systembeskrivelse:*\n${requestData.systemDescription || 'Ikke oppgitt'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Formål med trusselmodellering:*\n${requestData.threatModelingReasonText || 'Ikke oppgitt'}` } },
    ...(requestData.preferredTimeframe ? [
      { type: 'section', text: { type: 'mrkdwn', text: `*Ønsket tidsperiode:*\n${requestData.preferredTimeframe}` } }
    ] : []),
    ...(trelloUrl ? [
      { type: 'divider' },
      { type: 'section', text: { type: 'mrkdwn', text: `*Trello-kort:*\n<${trelloUrl}|Se Trello-kort for oppfølging>` } }
    ] : []),
    { type: 'divider' },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: `Opprettet: ${new Date(requestData.requestedAt || Date.now()).toLocaleString('no-NO', { 
          year: 'numeric', month: '2-digit', day: '2-digit', 
          hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' 
        })}`
      }]
    }
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

  return {
    type: 'home',
    blocks: [...introBlocks]
  };
}

module.exports = {
  buildThreatModelingNotificationMessage,
  buildAppHomeView
};