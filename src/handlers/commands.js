const logger = require('../logger');
const { getThreatModelingRequestModal } = require('../modals');
const { buildThreatModelingNotificationMessage } = require('../messages');

module.exports = function registerCommands(app, config = {}) {
  const notificationChannelId = config.notificationChannelId || process.env.NOTIFICATION_CHANNEL_ID;

  const openThreatModelingModal = async ({ command, ack, client, commandName }) => {
    await ack();
    logger.command(commandName || '/bestill-trusselmodellering', command.user_id, command.channel_id);

    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        view: getThreatModelingRequestModal()
      });
    } catch (error) {
      logger.error('Error opening modal:', error);
      try {
        await client.chat.postMessage({
          channel: command.user_id || command.user_id,
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

    const projectName = values?.project_name?.project_name_input?.value?.trim() || 'Uten navn';
    const systemDescription = values?.system_description?.system_description_input?.value?.trim() || 'Ikke oppgitt';
    const threatModelingType = values?.threatmodeling_type?.threatmodeling_type_select?.selected_option?.value || 'other';
    const threatModelingTypeText = values?.threatmodeling_type?.threatmodeling_type_select?.selected_option?.text?.text || 'Ikke oppgitt';
    const priority = values?.priority?.priority_select?.selected_option?.value || 'medium';
    const priorityText = values?.priority?.priority_select?.selected_option?.text?.text || 'Middels';
    const teamMembers = values?.team_members?.team_members_select?.selected_users || [];
    const additionalInfo = values?.additional_info?.additional_info_input?.value?.trim() || 'Ingen tilleggsinformasjon oppgitt.';

    const requestId = `TM-${Date.now()}`;
    logger.info(`New threat modeling request initiated: ${requestId} by ${user.id}`);

    const requestData = {
      projectName,
      systemDescription,
      threatModelingType,
      threatModelingTypeText,
      priority,
      priorityText,
      teamMembers,
      additionalInfo,
      requestedBy: user.id,
      requestedAt: new Date().toISOString(),
      status: 'processed'
    };

    try {
      // TODO: Create Trello card here - will be implemented later
      // const trelloUrl = await createTrelloCard(requestData);
      const trelloUrl = null; // Placeholder until Trello integration is implemented

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

      // Confirm to user that request is processed
      await client.chat.postMessage({
        channel: user.id,
        text: `Din trusselmodellering-forespørsel er mottatt! ID: ${requestId}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Takk for din trusselmodellering-forespørsel!*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${projectName}\n\nForespørselen din er mottatt og vil bli behandlet av AppSec.`
            }
          }
        ]
      });

    } catch (error) {
      logger.error('Error processing threat modeling request:', error);
      
      try {
        await client.chat.postMessage({
          channel: user.id,
          text: `Beklager, det oppstod en feil under behandling av trusselmodellering-forespørselen din. Vennligst prøv igjen eller kontakt teamet direkte.`
        });
      } catch (dmError) {
        logger.error('Error sending DM to user:', dmError);
      }
    }
  });
};
