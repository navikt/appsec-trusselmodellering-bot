const store = require('../store');
const logger = require('../logger');
const {
  getRejectReasonModal,
  getRequestInfoModal,
  getStatusUpdateModal,
  getApprovalModal,
  getReplyModal,
  getRequestDetailsModal
} = require('../modals');
const {
  buildChannelWelcomeMessage,
  buildApprovedMessage,
  buildRejectedMessage,
  buildAppHomeView
} = require('../messages');
const { sanitizeProjectName, validateUserId, validateRequestId } = require('../utils/validation');
const { ErrorHandler, SlackAPIError, RequestProcessingError } = require('../utils/errorHandling');

const parseAdminUsers = (value) =>
  value
    ? value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

class RequestActionHandlers {
  constructor(app, slackListsManager, config = {}, dependencies = {}) {
    this.app = app;
    this.slackListsManager = slackListsManager;
    this.adminChannelId = config.adminChannelId || process.env.ADMIN_CHANNEL_ID;
    this.adminUserIds = Array.isArray(config.adminUserIds)
      ? config.adminUserIds
      : parseAdminUsers(process.env.ADMIN_USER_IDS);
    
    this.logger = dependencies.logger || logger;
    this.store = dependencies.store || store;
    this.errorHandler = dependencies.errorHandler || ErrorHandler;
  }

  userIsAdmin(userId) {
    return Array.isArray(this.adminUserIds) && this.adminUserIds.includes(userId);
  }

  async denyIfNotAdmin(body, client, actionName = 'action') {
    const userId = body?.user?.id;
    if (this.userIsAdmin(userId)) return false;
    const channelId = body?.channel?.id || body?.container?.channel_id;
    const message = '🚫 Du har ikke tilgang til å utføre denne handlingen. Kontakt en administrator.';
    try {
      if (channelId) {
        await client.chat.postEphemeral({ channel: channelId, user: userId, text: message });
      } else if (userId) {
        await client.chat.postMessage({ channel: userId, text: message });
      }
    } catch (e) {
      this.logger?.warn?.('Failed to send unauthorized notice', { error: e.message, actionName });
    }
    return true;
  }

  register() {
    this.registerListCreation();
    this.registerApprovalFlow();
    this.registerRejectionFlow();
    this.registerInfoRequestFlow();
    this.registerReplyFlow();
    this.registerStatusFlow();
    this.registerViewDetails();
    this.registerRequesterChecklist();
  }

  registerRequesterChecklist() {
    this.app.action('requester_checklist', async ({ ack, body, client, action }) => {
      await ack();
      try {
        const channelId = body?.channel?.id || body?.container?.channel_id;
        const messageTs = body?.message?.ts || body?.container?.message_ts;

        let requestId = null;
        const blockId = action?.block_id || body?.actions?.[0]?.block_id;
        if (blockId && blockId.startsWith('requester_checklist:')) {
          requestId = blockId.split(':')[1];
        } else {

          const checklistBlock = (body?.message?.blocks || []).find((b) => b.type === 'actions' && typeof b.block_id === 'string' && b.block_id.startsWith('requester_checklist:'));
          if (checklistBlock) requestId = checklistBlock.block_id.split(':')[1];
        }

        if (!requestId) {
          this.logger.warn('Checklist action without requestId');
          return;
        }

        const selections = (action?.selected_options || []).map((opt) => opt.value);

        await this.store.updateRequest(requestId, { checklistSelections: selections });

        const request = await this.store.getRequest(requestId);
        if (!request || !channelId || !messageTs) return;

        const approverLike = { id: request.approvedBy || body.user.id };
        const updated = buildChannelWelcomeMessage(requestId, request, approverLike, request.jiraTicketUrl || null, selections);

        await client.chat.update({
          channel: channelId,
          ts: messageTs,
          metadata: {
            event_type: 'pentest_channel_welcome',
            event_payload: {
              requestId,
              projectName: request.projectName,
              approvedBy: approverLike.id,
              jiraTicketUrl: request.jiraTicketUrl || '',
              checklistSelections: selections
            }
          },
          ...updated
        });
      } catch (error) {
        this.logger.error('Error handling requester checklist:', error);
      }
    });
  }

  registerListCreation() {
    this.app.action('create_pentest_list', async ({ ack, body, client }) => {
      await ack();

      const channelId = body?.channel?.id || body?.container?.channel_id;
      const messageTs = body?.message?.ts || body?.container?.message_ts;

      if (await this.denyIfNotAdmin(body, client, 'create_pentest_list')) return;

      try {
        logger.debug('Create list button clicked', { userId: body.user.id });

        if (channelId && messageTs) {
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            text: 'Oppretter liste...',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '⏳ *Oppretter Pentest-bestillinger liste...*\n\nVennligst vent...'
                }
              }
            ]
          });
        }

        if (!this.slackListsManager) {
          throw new Error('Slack Lists Manager er ikke initialisert ennå.');
        }

        await this.slackListsManager.handleCreateListButton(body.user.id);

        if (channelId && messageTs) {
          await client.chat.delete({ channel: channelId, ts: messageTs });
        }
      } catch (error) {
        logger.error('Error handling create list button:', error);

        if (channelId && messageTs) {
          await client.chat.update({
            channel: channelId,
            ts: messageTs,
            text: 'Feil ved oppretting av liste',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `❌ *Kunne ikke opprette listen*\n\n\`\`\`${error.message}\`\`\``
                }
              }
            ]
          });
        }
      }
    });
  }

  registerApprovalFlow() {
    this.app.action('approve_request', async (payload) => this.handleApproveRequest(payload));
    this.app.view('approve_with_jira_modal', async (payload) => this.handleApproveSubmission(payload));
  }

  async handleApproveRequest({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('approve_request', body.user.id, { requestId });

    if (await this.denyIfNotAdmin(body, client, 'approve_request')) return;

    let request = await this.getRequestWithRetry(requestId);
    logger.debug('Retrieved request for approval', { requestId, found: !!request });

    if (!request) {
      const reconstructed = this.reconstructRequestFromMessage(body, requestId);
      if (reconstructed) {
        logger.warn('Rehydrating missing request from Slack message', { requestId });
        await store.saveRequest(requestId, reconstructed);
        request = reconstructed;
      } else {
        await this.markMessageUnavailable(client, body);
        const channelId = body?.channel?.id;
        if (channelId) {
          await client.chat.postEphemeral({
            channel: channelId,
            user: body.user.id,
            text: '❌ Forespørselen ble ikke funnet. Den kan allerede være behandlet.'
          });
        }
        return;
      }
    }

    if (request.status !== 'pending') {
      const channelId = body?.channel?.id;
      if (channelId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: body.user.id,
          text: `⚠️ Denne forespørselen er allerede ${request.status}.`
        });
      }
      return;
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getApprovalModal(requestId)
      });
    } catch (error) {
      logger.error('Error opening approval modal:', error);
      const channelId = body?.channel?.id;
      if (channelId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: body.user.id,
          text: '❌ Kunne ikke åpne godkjenningsskjema. Prøv igjen.'
        });
      }
    }
  }

  async handleApproveSubmission({ ack, body, client, view }) {
    await ack();

    const requestId = view.private_metadata;
    const jiraUrl = view.state.values.jira_ticket_url?.jira_url_input?.value || null;
    const approver = body.user;

    logger.action('approve_with_jira_modal', approver.id, { requestId, jiraUrl });

  // Admin-only
  if (await this.denyIfNotAdmin(body, client, 'approve_with_jira_modal')) return;

    const request = await store.getRequest(requestId);

    if (!request) {
      logger.error('Request not found in approval submission', { requestId });
      return;
    }

    if (request.status !== 'pending') {
      logger.warn('Request already processed', { requestId, status: request.status });
      return;
    }

    try {
      const normalizedProject = sanitizeProjectName(request.projectName);
      const channelName = `pentest-${normalizedProject}-${Date.now()
        .toString()
        .slice(-6)}`;

      logger.slack('Creating private channel', { channelName });
      const conversation = await client.conversations.create({
        name: channelName,
        is_private: true
      });
      const channelId = conversation.channel.id;
      logger.success(`Private channel created: ${channelId}`);

      const topicText = jiraUrl
        ? `Pentest for ${request.projectName} | Forespørsels-ID: ${requestId} | Jira: ${jiraUrl}`
        : `Pentest for ${request.projectName} | Forespørsels-ID: ${requestId}`;

      await client.conversations.setTopic({ channel: channelId, topic: topicText });
      await client.conversations.setPurpose({
        channel: channelId,
        purpose: `Pentesting ${request.projectName} - ${request.pentestTypeText} | Hastegrad: ${request.urgencyText}`
      });

      const membersToInvite = [
        request.requestedBy,
        ...(Array.isArray(request.teamMembers) ? request.teamMembers : []),
        ...(Array.isArray(request.assignedTo) ? request.assignedTo : []),
        ...this.adminUserIds
      ].filter((id, index, self) => id && self.indexOf(id) === index);

      logger.debug('Inviting members to channel', {
        channelId,
        memberCount: membersToInvite.length,
        members: membersToInvite
      });

      for (const userId of membersToInvite) {
        try {
          await client.conversations.invite({ channel: channelId, users: userId });
          logger.debug(`Invited user ${userId} to channel`);
        } catch (error) {
          logger.error(`Error inviting user ${userId}:`, error);
        }
      }

      await this.sleep(500);

      const welcomeMessage = buildChannelWelcomeMessage(requestId, request, approver, jiraUrl);

      await client.chat.postMessage({
        channel: channelId,
        metadata: {
          event_type: 'pentest_channel_welcome',
          event_payload: {
            requestId,
            projectName: request.projectName,
            approvedBy: approver.id,
            jiraTicketUrl: jiraUrl || ''
          }
        },
        ...welcomeMessage
      });

      if (request.adminMessageTs && this.adminChannelId) {
        try {
          await client.chat.update({
            channel: this.adminChannelId,
            ts: request.adminMessageTs,
            metadata: {
              event_type: 'pentest_request',
              event_payload: {
                requestId,
                status: 'approved',
                projectName: request.projectName,
                requestedBy: request.requestedBy,
                pentestTypeText: request.pentestTypeText,
                urgencyText: request.urgencyText,
                teamMembers: request.teamMembers,
                additionalInfo: request.additionalInfo,
                fullReport: request.fullReport,
                adminMessageTs: request.adminMessageTs,
                channelId,
                approvedBy: approver.id,
                approvedAt: new Date().toISOString(),
                jiraTicketUrl: jiraUrl || ''
              }
            },
            ...buildApprovedMessage(requestId, request, approver, channelId, jiraUrl)
          });
          logger.success('Admin channel message updated');
        } catch (error) {
          logger.warn('Could not update admin channel message', { error: error.message });
        }
      }

      const requesterMessageText = jiraUrl
        ? `✅ *Pentest-forespørselen din er godkjent!*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${request.projectName}\n*Kanal:* <#${channelId}>\n*Jira-sak:* ${jiraUrl}\n\nBli med i kanalen for å koordinere med SåPe.`
        : `✅ *Pentest-forespørselen din er godkjent!*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${request.projectName}\n*Kanal:* <#${channelId}>\n\nBli med i kanalen for å koordinere med SåPe.`;

      await client.chat.postMessage({
        channel: request.requestedBy,
        text: 'Din pentest-forespørsel er godkjent!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: requesterMessageText
            }
          }
        ]
      });

      let listItemId = request.listItemId;
      if (this.slackListsManager) {
        if (!listItemId) {
          logger.info('Adding approved request to Slack List', { requestId });
          listItemId = await this.slackListsManager.addRequest(requestId, request);
          if (listItemId) {
            logger.success('Request added to Slack List with pending status', {
              requestId,
              listItemId
            });
          }
        } else {
          await this.slackListsManager.updateRequestStatus(requestId, listItemId, 'approved');
        }
      }

      await store.updateRequest(requestId, {
        status: 'approved',
        channelId,
        approvedBy: approver.id,
        approvedAt: new Date().toISOString(),
        jiraTicketUrl: jiraUrl || '',
        listItemId
      });
    } catch (error) {
      logger.error('Error approving request:', error);
      try {
        await client.chat.postMessage({
          channel: approver.id,
          text: '❌ Det oppstod en feil ved godkjenning. Prøv igjen eller kontakt støtte.'
        });
      } catch (dmError) {
        logger.error('Could not send error DM:', dmError);
      }
    }
  }

  registerRejectionFlow() {
    this.app.action('reject_request', async (payload) => this.handleRejectRequest(payload));
    this.app.view('reject_reason_modal', async (payload) => this.handleRejectionSubmission(payload));
  }

  async handleRejectRequest({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('reject_request', body.user.id, { requestId });

    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'reject_request')) return;

    let request = await this.getRequestWithRetry(requestId);
    logger.debug('Retrieved request for rejection', { requestId, found: !!request });

    if (!request) {
      const reconstructed = this.reconstructRequestFromMessage(body, requestId);
      if (reconstructed) {
        logger.warn('Rehydrating missing request from Slack message', { requestId });
        await store.saveRequest(requestId, reconstructed);
        request = reconstructed;
      } else {
        await this.markMessageUnavailable(client, body);
        const channelId = body?.channel?.id;
        if (channelId) {
          await client.chat.postEphemeral({
            channel: channelId,
            user: body.user.id,
            text: '❌ Forespørselen ble ikke funnet. Den kan allerede være behandlet.'
          });
        }
        return;
      }
    }

    if (request.status !== 'pending') {
      const channelId = body?.channel?.id;
      if (channelId) {
        await client.chat.postEphemeral({
          channel: channelId,
          user: body.user.id,
          text: `⚠️ Denne forespørselen er allerede ${request.status}.`
        });
      }
      return;
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getRejectReasonModal(requestId)
      });
    } catch (error) {
      logger.error('Error opening rejection modal:', error);
    }
  }

  async handleRejectionSubmission({ ack, body, view, client }) {
    await ack();
    logger.modal('reject_reason_modal', body.user.id, 'submitted');

    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'reject_reason_modal')) return;

    const requestId = view.private_metadata;
    const request = await store.getRequest(requestId);
    const rejector = body.user;
    const reason = view.state.values.rejection_reason.reason_input.value;

    if (!request) {
      logger.warn('Request not found for rejection', { requestId });
      return;
    }

    try {
      if (request.adminMessageTs && this.adminChannelId) {
        await client.chat.update({
          channel: this.adminChannelId,
          ts: request.adminMessageTs,
          metadata: {
            event_type: 'pentest_request',
            event_payload: {
              requestId,
              status: 'rejected',
              projectName: request.projectName,
              requestedBy: request.requestedBy,
              pentestTypeText: request.pentestTypeText,
              urgencyText: request.urgencyText,
              teamMembers: request.teamMembers,
              additionalInfo: request.additionalInfo,
              fullReport: request.fullReport,
              adminMessageTs: request.adminMessageTs,
              rejectedBy: rejector.id,
              rejectedAt: new Date().toISOString(),
              rejectReason: reason
            }
          },
          ...buildRejectedMessage(requestId, request, rejector, reason)
        });
      }

      await client.chat.postMessage({
        channel: request.requestedBy,
        text: 'Din pentest-forespørsel er avvist.',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Pentest-forespørselen din er avvist*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${request.projectName}\n\n*Begrunnelse:*\n${reason}\n\nHvis du har spørsmål, kontakt SåPe.`
            }
          }
        ]
      });

      await store.updateRequest(requestId, {
        status: 'rejected',
        rejectedBy: rejector.id,
        rejectedAt: new Date().toISOString()
      });

      if (this.slackListsManager && request.listItemId) {
        await this.slackListsManager.updateRequestStatus(requestId, request.listItemId, 'rejected');
      }
    } catch (error) {
      logger.error('Error rejecting request:', error);
    }
  }

  registerInfoRequestFlow() {
    this.app.action('request_info', async (payload) => this.handleRequestInfo(payload));
    this.app.view('request_info_modal', async (payload) => this.handleInfoSubmission(payload));
  }

  async handleRequestInfo({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('request_info', body.user.id, { requestId });

    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'request_info')) return;

    let request = await this.getRequestWithRetry(requestId);
    if (!request) {
      const reconstructed = this.reconstructRequestFromMessage(body, requestId);
      if (reconstructed) {
        logger.warn('Rehydrating missing request from Slack message', { requestId });
        await store.saveRequest(requestId, reconstructed);
        request = reconstructed;
      } else {
        await this.markMessageUnavailable(client, body);
        const channelId = body?.channel?.id;
        if (channelId) {
          await client.chat.postEphemeral({
            channel: channelId,
            user: body.user.id,
            text: '❌ Forespørselen ble ikke funnet. Den kan allerede være behandlet.'
          });
        }
        return;
      }
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getRequestInfoModal(requestId)
      });
      logger.success('Info request modal opened');
    } catch (error) {
      logger.error('Error opening info request modal:', error);
    }
  }

  async handleInfoSubmission({ ack, body, view, client }) {
    await ack();
    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'request_info_modal')) return;
    const requestId = view.private_metadata;
    const request = await store.getRequest(requestId);
    const requester = body.user;
    const message = view.state.values.info_request.message_input.value;

    if (!request) {
      logger.warn('Request not found in info submission', { requestId });
      return;
    }

    try {
      const dmResult = await client.chat.postMessage({
        channel: request.requestedBy,
        text: 'Tilleggsinformasjon trengs for pentest-forespørselen din',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💬 *Tilleggsinformasjon trengs*\n\n*Forespørsels-ID:* ${requestId}\n*Prosjekt:* ${request.projectName}\n*Fra:* <@${requester.id}>\n\n*Melding:*\n${message}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '💬 Svar',
                  emoji: true
                },
                action_id: 'reply_to_admin',
                value: requestId
              }
            ]
          }
        ]
      });
      logger.success('Info request sent to requester', { ts: dmResult.ts });

      if (this.adminChannelId && request.adminMessageTs) {
        const threadResult = await client.chat.postMessage({
          channel: this.adminChannelId,
          thread_ts: request.adminMessageTs,
          text: `<@${requester.id}> ba om mer informasjon fra <@${request.requestedBy}>`
        });
        logger.success('Admin thread notification posted', { ts: threadResult.ts });
      }
    } catch (error) {
      logger.error('Error sending info request:', error);
    }
  }

  registerReplyFlow() {
    this.app.action('reply_to_admin', async (payload) => this.handleReplyAction(payload));
    this.app.view('reply_modal', async (payload) => this.handleReplySubmission(payload));
  }

  async handleReplyAction({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('reply_to_admin', body.user.id, { requestId });

    let request = await this.getRequestWithRetry(requestId);
    if (!request) {
      const reconstructed = this.reconstructRequestFromMessage(body, requestId);
      if (reconstructed) {
        logger.warn('Rehydrating missing request from Slack message', { requestId });
        await store.saveRequest(requestId, reconstructed);
        request = reconstructed;
      } else {
        await this.markMessageUnavailable(client, body);
        await client.chat.postEphemeral({
          channel: body.user.id,
          user: body.user.id,
          text: '❌ Forespørsel ikke funnet.'
        });
        return;
      }
    }

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getReplyModal(requestId)
      });
    } catch (error) {
      logger.error('Error opening reply modal:', error);
    }
  }

  async handleReplySubmission({ ack, body, view, client }) {
    await ack();
    const requestId = view.private_metadata;
    const replyer = body.user;
    const replyMessage = view.state.values.reply_message.message_input.value;

    const request = await this.getRequestWithRetry(requestId);

    if (!request) {
      logger.warn('Request not found for reply', { requestId });
      return;
    }

    try {
      if (this.adminChannelId && request.adminMessageTs) {
        await client.chat.postMessage({
          channel: this.adminChannelId,
          thread_ts: request.adminMessageTs,
          text: `📨 *Svar fra <@${replyer.id}>:*\n\n${replyMessage}`
        });
        logger.success('Reply posted to admin thread');
      }

      await client.chat.postMessage({
        channel: replyer.id,
        text: '✅ Svaret ditt er sendt til administratorene.'
      });
    } catch (error) {
      logger.error('Error sending reply:', error);
    }
  }

  registerStatusFlow() {
    this.app.action('update_status', async (payload) => this.handleStatusAction(payload));
    this.app.view('status_update_modal', async (payload) => this.handleStatusSubmission(payload));
  }

  async handleStatusAction({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('update_status', body.user.id, { requestId });

    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'update_status')) return;

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getStatusUpdateModal(requestId)
      });
    } catch (error) {
      logger.error('Error opening status modal:', error);
    }
  }

  async handleStatusSubmission({ ack, body, view, client }) {
    await ack();
    // Admin-only
    if (await this.denyIfNotAdmin(body, client, 'status_update_modal')) return;
    const requestId = view.private_metadata;
    const updater = body.user;
    const status = view.state.values.status_select.status_input.selected_option;
    const note = view.state.values.status_note.note_input.value || '';

    const request = await this.getRequestWithRetry(requestId);
    if (!request) {
      logger.warn('Request not found for status update', { requestId });
      return;
    }

    try {
      if (request.channelId) {
        await client.conversations.setTopic({
          channel: request.channelId,
          topic: `Pentest for ${request.projectName} | Status: ${status.text.text} | ID: ${requestId}`
        });

        await client.chat.postMessage({
          channel: request.channelId,
          text: `Status oppdatert til ${status.text.text}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📊 *Statusoppdatering*\n\n*Ny status:* ${status.text.text}\n*Oppdatert av:* <@${updater.id}>\n${note ? `*Notater:* ${note}` : ''}`
              }
            }
          ]
        });
      }

      await store.addStatusHistory(requestId, {
        status: status.value,
        statusText: status.text.text,
        updatedBy: updater.id,
        note,
        timestamp: new Date().toISOString()
      });

      await store.updateRequest(requestId, {
        currentStatus: status.value
      });

      // Optionally refresh Home tab; keep static to avoid rate limits
      try {
        if (request.requestedBy) {
          await client.views.publish({ user_id: request.requestedBy, view: buildAppHomeView(request.requestedBy, []) });
        }
        if (updater?.id && updater.id !== request.requestedBy) {
          await client.views.publish({ user_id: updater.id, view: buildAppHomeView(updater.id, []) });
        }
      } catch (e) {
        logger.warn('Home republish failed after status update', { error: e.message });
      }
    } catch (error) {
      logger.error('Error updating status:', error);
    }
  }

  registerViewDetails() {
    this.app.action('view_details', async (payload) => this.handleViewDetails(payload));
  }

  async handleViewDetails({ ack, body, client, action }) {
    await ack();
    const requestId = action.value;
    logger.action('view_details', body.user.id, { requestId });

    let request = await this.getRequestWithRetry(requestId);
    if (!request) {
      const reconstructed = this.reconstructRequestFromMessage(body, requestId);
      if (reconstructed) {
        logger.warn('Rehydrating missing request from Slack message', { requestId });
        await store.saveRequest(requestId, reconstructed);
        request = reconstructed;
      } else {
        await this.markMessageUnavailable(client, body);
        await client.chat.postEphemeral({
          channel: body.channel.id,
          user: body.user.id,
          text: '❌ Forespørsel ikke funnet.'
        });
        return;
      }
    }

    try {
      const statusHistory = await store.getStatusHistory(requestId);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: getRequestDetailsModal(request, requestId, statusHistory)
      });
    } catch (error) {
      logger.error('Error showing request details:', error);
    }
  }

  async getRequestWithRetry(requestId, attempts = 2, delayMs = 250) {
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      try {
        const request = await store.getRequest(requestId);
        if (request) return request;
      } catch (error) {
        lastErr = error;
      }
      if (i < attempts - 1) {
        await this.sleep(delayMs);
      }
    }
    if (lastErr) {
      logger.warn('getRequestWithRetry error', { requestId, error: lastErr.message });
    }
    return null;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async markMessageUnavailable(client, body, reasonText = 'Denne forespørselen er ikke tilgjengelig lenger (kan være behandlet eller slettet).') {
    try {
      const channelId = body?.channel?.id || body?.container?.channel_id;
      const ts = body?.message?.ts || body?.container?.message_ts;
      if (!channelId || !ts) return;

      const originalBlocks = Array.isArray(body?.message?.blocks) ? body.message.blocks : [];
      const filteredBlocks = originalBlocks.filter((block) => block.type !== 'actions');

      await client.chat.update({
        channel: channelId,
        ts,
        text: 'Forespørselen er ikke tilgjengelig lenger.',
        blocks: [
          ...filteredBlocks,
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `⚠️ ${reasonText}` }
          }
        ]
      });
    } catch (error) {
      logger.error('Failed to mark message as unavailable', { error: error.message });
    }
  }

  reconstructRequestFromMessage(body, requestId) {
    try {
      const metadata = body?.message?.metadata?.event_payload;
      if (metadata && (metadata.requestId === requestId || !requestId)) {
        return {
          projectName: metadata.projectName || 'Uten navn',
          targetScope: metadata.targetScope || 'Ikke oppgitt',
          pentestTypeText: metadata.pentestTypeText || 'Ikke oppgitt',
          urgencyText: metadata.urgencyText || 'Ikke oppgitt',
          teamMembers: Array.isArray(metadata.teamMembers) ? metadata.teamMembers : [],
          additionalInfo: metadata.additionalInfo || 'Ingen',
          fullReport: metadata.fullReport || 'unspecified',
          requestedBy: metadata.requestedBy || '',
          requestedAt: metadata.requestedAt || new Date().toISOString(),
          status: metadata.status || 'pending',
          adminMessageTs: body?.message?.ts || '',
          channelId: body?.channel?.id || body?.container?.channel_id || ''
        };
      }

      const blocks = body?.message?.blocks;
      if (!Array.isArray(blocks) || blocks.length === 0) {
        return null;
      }

      const texts = [];
      for (const block of blocks) {
        if (block?.type === 'section') {
          if (Array.isArray(block.fields)) {
            block.fields.forEach((field) => {
              if (field?.type === 'mrkdwn' && typeof field.text === 'string') {
                texts.push(field.text);
              }
            });
          }

          if (block.text?.type === 'mrkdwn' && typeof block.text.text === 'string') {
            texts.push(block.text.text);
          }
        }
      }

      const findLabelValue = (label) => {
        const needle = `*${label}:*`;
        const match = texts.find((entry) => entry.includes(needle));
        if (!match) return null;
        const [, value] = match.split('\n');
        return (value || '').trim();
      };

      const projectName = findLabelValue('Prosjektnavn') || 'Uten navn';
      const pentestTypeText = findLabelValue('Testtype') || 'Ikke oppgitt';
      const urgencyText = findLabelValue('Hastegrad') || 'Ikke oppgitt';
      const targetScope = findLabelValue('Testområde') || 'Ikke oppgitt';
      const additionalInfo = findLabelValue('Tilleggsinformasjon') || 'Ingen';
      const fullReportText = findLabelValue('Fullstendig rapport') || 'Ikke oppgitt';
      const fullReport = /ja/i.test(fullReportText)
        ? 'yes'
        : /nei/i.test(fullReportText)
        ? 'no'
        : 'unspecified';

      const requestedByText = findLabelValue('Forespurt av') || '';
      const requestedByMatch = requestedByText.match(/<@([A-Z0-9]+)/i);
      const requestedBy = requestedByMatch ? requestedByMatch[1] : '';

      const teamMembersText = findLabelValue('Teammedlemmer') || '';
      const teamMembers = [];
      const mentionRegex = /<@([A-Z0-9]+)>/gi;
      let match;
      while ((match = mentionRegex.exec(teamMembersText))) {
        teamMembers.push(match[1]);
      }

      if (!requestedBy || !projectName) {
        return null;
      }

      return {
        projectName,
        targetScope,
        pentestTypeText,
        urgencyText,
        teamMembers,
        additionalInfo,
        fullReport,
        requestedBy,
        requestedAt: new Date().toISOString(),
        status: 'pending',
        adminMessageTs: body?.message?.ts || '',
        channelId: body?.channel?.id || body?.container?.channel_id || ''
      };
    } catch (error) {
      logger.error('Failed to reconstruct request from message', { error: error.message, requestId });
      return null;
    }
  }
}

module.exports = function registerActions(app, slackListsManager, config = {}) {
  const handlers = new RequestActionHandlers(app, slackListsManager, config);
  handlers.register();
  return handlers;
};

module.exports.RequestActionHandlers = RequestActionHandlers;
