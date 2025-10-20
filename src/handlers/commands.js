const store = require('../store');
const logger = require('../logger');
const { getPentestRequestModal } = require('../modals');
const { buildAdminRequestMessage } = require('../messages');

module.exports = function registerCommands(app, config = {}) {
  const adminChannelId = config.adminChannelId || process.env.ADMIN_CHANNEL_ID;

  const openPentestModal = async ({ command, ack, client, commandName }) => {
    await ack();
    logger.command(commandName || '/bestill-pentest', command.user_id, command.channel_id);

    try {
      await client.views.open({
        trigger_id: command.trigger_id,
        view: getPentestRequestModal()
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

  app.command('/bestill-pentest', async (ctx) => openPentestModal({ ...ctx, commandName: '/bestill-pentest' }));

  app.view('pentest_request_modal', async ({ ack, body, view, client }) => {
    await ack();
    logger.modal('pentest_request_modal', body.user.id, 'submitted');

    const values = view.state.values;
    const user = body.user;

    const projectName = values?.project_name?.project_name_input?.value?.trim() || 'Uten navn';
    const targetScope = values?.target_scope?.target_scope_input?.value?.trim() || 'Ikke oppgitt';
    const pentestType = values?.pentest_type?.pentest_type_select?.selected_option?.value || 'other';
    const pentestTypeText = values?.pentest_type?.pentest_type_select?.selected_option?.text?.text || 'Ikke oppgitt';
    const urgency = values?.urgency?.urgency_select?.selected_option?.value || 'unknown';
    const urgencyText = values?.urgency?.urgency_select?.selected_option?.text?.text || 'Ikke oppgitt';
    const teamMembers = values?.team_members?.team_members_select?.selected_users || [];
    const fullReport = values?.full_report?.full_report_choice?.selected_option?.value || 'unspecified';
    const additionalInfo = values?.additional_info?.additional_info_input?.value?.trim()
      || 'Fyll inn så godt du kan. Ved godkjenning opprettes en Slack-kanal for pentesten hvor du kan supplere informasjon.';

    const requestId = `PT-${Date.now()}`;
    logger.info(`New pentest request initiated: ${requestId} by ${user.id}`);

    const requestData = {
      projectName,
      targetScope,
      pentestType,
      pentestTypeText,
      urgency,
      urgencyText,
      teamMembers,
      additionalInfo,
      requestedBy: user.id,
      fullReport,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    };

    try {
      logger.slack('Posting request to admin channel', { requestId, channel: adminChannelId });
      const result = await client.chat.postMessage({
        channel: adminChannelId,
        metadata: {
          event_type: 'pentest_request',
          event_payload: {
            requestId,
            ...requestData
          }
        },
        ...buildAdminRequestMessage(requestId, user, requestData)
      });
      logger.success(`Request posted to admin channel`, { requestId, ts: result.ts });

      logger.redis('SAVE', requestId);
      await store.saveRequest(requestId, {
        ...requestData,
        adminMessageTs: result.ts
      });

        await client.chat.postMessage({
        channel: user.id,
        text: `Din forespørsel har blitt sendt inn! ID: ${requestId}`,
        blocks: [
            {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `✅ *Din pentest-forespørsel er sendt inn!*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${projectName}\n\nTeam SåPe vårt vil gjennomgå forespørselen og komme tilbake til deg snart.`
            }
            }
        ]
    });


    } catch (error) {
      logger.error('Error posting to admin channel:', error);
      
      try {
        await client.chat.postMessage({
          channel: user.id,
          text: `Beklager, det oppstod en feil under innsending av forespørselen din om pentest. Vennligst prøv igjen eller kontakt SåPe direkte.`
        });
      } catch (dmError) {
        logger.error('Error sending DM to user:', dmError);
      }
    }
  });
};
