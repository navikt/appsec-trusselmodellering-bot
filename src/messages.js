const buildThreatModelingNotificationMessage = (requestId, user, requestData, trelloUrl = null) => ({
  blocks: [
    { type: 'header', text: { type: 'plain_text', text: '🛡️ Ny trusselmodellering-forespørsel', emoji: true } },
    {
      type: 'section', fields: [
        { type: 'mrkdwn', text: `*Forespurt av:* <@${user.id}>` },
        { type: 'mrkdwn', text: `*Team:* ${requestData.teamName || 'Ikke oppgitt'}` },
        ...(requestData.preferredTimeframe ? [{ type: 'mrkdwn', text: `*Ønsket tidsperiode:* ${requestData.preferredTimeframe}` }] : []),
        ...(trelloUrl ? [{ type: 'mrkdwn', text: `*Trello-kort:* <${trelloUrl}|Se Trello-kort>` }] : [])
      ]
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
