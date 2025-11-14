const logger = require('../logger');
const { getThreatModelingRequestModal } = require('../modals');
const { buildThreatModelingNotificationMessage } = require('../messages');
const { getThreatModelingReasonLabel } = require('../constants/lists');
const TrelloService = require('../services/trelloService');

module.exports = function registerCommands(app, config = {}) {
  const notificationChannelId = config.notificationChannelId || process.env.NOTIFICATION_CHANNEL_ID;

  const openThreatModelingModal = async ({ command, ack, client, commandName }) => {
    try {
      await ack();
      logger.info(`Command received: ${commandName || '/bestill-trusselmodellering'}`, { 
        user: command.user_id, 
        channel: command.channel_id,
        trigger_id: command.trigger_id 
      });

      await client.views.open({
        trigger_id: command.trigger_id,
        view: getThreatModelingRequestModal()
      });
      
      logger.info('Modal opened successfully');
    } catch (error) {
      logger.error('Error in command handler:', error);
      try {
        await client.chat.postMessage({
          channel: command.user_id,
          text: `Beklager, det oppstod en feil da modalen skulle åpnes. Prøv igjen senere.`
        });
      } catch (dmErr) {
        logger.error('Error sending error DM to user:', dmErr);
      }
    }
  };

  app.command('/bestill-trusselmodellering', async (ctx) => openThreatModelingModal({ ...ctx, commandName: '/bestill-trusselmodellering' }));

  app.view('threatmodeling_request_modal', async ({ ack, body, view, client }) => {
    await ack();
    logger.modal('threatmodeling_request_modal', body.user.id, 'submitted');

    const values = view.state.values;
    const user = body.user;

    const teamName = values?.team_name?.team_name_input?.value?.trim() || 'Ikke oppgitt';
    const systemDescription = values?.system_description?.system_description_input?.value?.trim() || 'Ikke oppgitt';
    const threatModelingReason = values?.threat_modeling_reason?.threat_modeling_reason_select?.selected_option?.value || 'standalone';
    const threatModelingReasonText = values?.threat_modeling_reason?.threat_modeling_reason_select?.selected_option?.text?.text || getThreatModelingReasonLabel(threatModelingReason);
    const preferredTimeframe = values?.preferred_timeframe?.preferred_timeframe_input?.value?.trim() || null;

    const requestId = `TM-${Date.now()}`;
    logger.info(`New threat modeling request initiated: ${requestId} by ${user.id}`);

    const requestData = {
      teamName,
      systemDescription,
      threatModelingReason,
      threatModelingReasonText,
      preferredTimeframe,
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
      status: 'processed'
    };

    try {
      // Create Trello card
      const trelloService = new TrelloService();
      const cardName = `Trusselmodellering bestilt av ${teamName}`;
      const cardDescription = `**Team:** ${teamName}

      **Beskrivelse:** ${systemDescription}

      **Formål:** ${threatModelingReasonText}

      **Ønsket tidsperiode:** ${preferredTimeframe || 'Ikke oppgitt'}

      **Forespurt av:** ${user.id} (Denne er ulesbar i Trello, men brukernavn står i Slack-posten)
      **Forespørsels-ID:** ${requestId}
      **Opprettet:** ${new Date().toLocaleString('no-NO', { timeZone: 'Europe/Oslo' })}`;

      const trelloCard = await trelloService.createCard(cardName, cardDescription);
      const trelloUrl = trelloCard.shortUrl;
      logger.info(`Trello card created for request ${requestId}: ${trelloUrl}`);

      // Post notification to team channel
      logger.slack('Posting threat modeling request to notification channel', { requestId, channel: notificationChannelId });
      const result = await client.chat.postMessage({
        channel: notificationChannelId,
        metadata: {
          event_type: 'threatmodeling_request',
          event_payload: {
            requestId,
            ...requestData,
            trelloCardUrl: trelloUrl || ''
          }
        },
        ...buildThreatModelingNotificationMessage(requestId, user, requestData, trelloUrl)
      });
      logger.success(`Threat modeling request posted to notification channel`, { requestId, ts: result.ts });

      logger.success(`Threat modeling request processed successfully for user ${user.id}`, { requestId });

    } catch (error) {
      logger.error('Error processing threat modeling request:', error);
    }
  });
};
