const logger = require('./logger');
const {
  LIST_NAME,
  LIST_SCHEMA,
  LIST_COLUMNS,
  REQUEST_TO_LIST_STATUS,
  DEFAULT_ADMIN_MESSAGE_PLACEHOLDER
} = require('./constants/lists');
const { buildRichTextField } = require('./utils/slackRichText');
const {
  validateRequestData,
  validateRequestId,
  validateUserId,
  validateChannelId,
  sanitizeProjectName
} = require('./utils/validation');
const {
  SlackAPIError,
  RequestProcessingError,
  ConfigurationError,
  ErrorHandler,
  RetryConfigs
} = require('./utils/errorHandling');
const SlackAPIService = require('./services/slackAPI');

const COLUMN_ALIAS_BY_KEY = {};
const COLUMN_ALIAS_BY_NAME = {};

Object.entries(LIST_COLUMNS).forEach(([alias, definition]) => {
  COLUMN_ALIAS_BY_KEY[definition.key] = alias;
  COLUMN_ALIAS_BY_NAME[definition.name] = alias;
});

const COLUMN_PROPERTY_MAP = Object.freeze({
  projectName: 'projectColumnId',
  requestId: 'requestIdColumnId',
  status: 'statusColumnId',
  urgency: 'urgencyColumnId',
  assignedTo: 'assignedToColumnId',
  requestedBy: 'requestedByColumnId',
  threatModelingType: 'threatModelingTypeColumnId',
  adminMessageTs: 'adminMessageTsColumnId'
});

/**
 * Implements the IListManager interface for testability
 */
class SlackListsManager {
  /**
   * Creates a new SlackListsManager instance
   * @param {Object} client - Slack client for API calls
   * @param {string} notificationChannelId - Notification channel ID for notifications
   * @param {string|null} initialListId - Existing list ID if available
   * @param {Object} dependencies - Dependency injection for testing
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.errorHandler - Error handler instance
   * @throws {ConfigurationError} When required parameters are missing or invalid
   */
  constructor(client, notificationChannelId, initialListId = null, dependencies = {}) {
    if (!client) {
      throw new ConfigurationError('Slack client is required');
    }

    if (notificationChannelId) {
      validateChannelId(notificationChannelId, 'notificationChannelId');
    }

    this.client = client;
    this.notificationChannelId = notificationChannelId;
    this.listId = initialListId || null;

    this.logger = dependencies.logger || logger;
    this.errorHandler = dependencies.errorHandler || ErrorHandler;
    this.apiService = dependencies.apiService || new SlackAPIService(client, {
      logger: this.logger,
      errorHandler: this.errorHandler
    });

    this.resetColumnIds();
  }

  resetColumnIds() {
    this.columnIds = {
      projectName: null,
      requestId: null,
      status: null,
      urgency: null,
      assignedTo: null,
      requestedBy: null,
      threatModelingType: null,
      adminMessageTs: null
    };

    Object.values(COLUMN_PROPERTY_MAP).forEach((property) => {
      this[property] = null;
    });
  }

  setColumnId(alias, id) {
    if (!Object.prototype.hasOwnProperty.call(this.columnIds, alias)) {
      return;
    }

    this.columnIds[alias] = id || null;
    const property = COLUMN_PROPERTY_MAP[alias];
    if (property) {
      this[property] = id || null;
    }
  }

  getColumnStateForLog() {
    return { ...this.columnIds };
  }

  /**
   * Initialize the Slack List for threat modeling requests
   * Either loads an existing list or prompts to create one
   * @returns {Promise<string|null>} List ID if ready, null if waiting for creation
   * @throws {SlackAPIError} When API calls fail
   * @throws {ConfigurationError} When configuration is invalid
   */
  async initializeList() {
    try {
      this.logger.info('Initializing Threat Modeling Requests List...');

      if (!this.listId) {
        this.logger.warn('No THREAT_MODELING_LIST_ID found - waiting to create list...');
        await this.sendCreateListMessage();
        return null;
      }

      this.logger.info(`Using existing list ID: ${this.listId}`);
      await this.loadListSchema();
      this.logger.success('List schema loaded successfully');
      return this.listId;
    } catch (error) {
      this.logger.error('Error initializing list:', error);
      throw error;
    }
  }

  async sendCreateListMessage() {
    try {
      await this.client.chat.postMessage({
        channel: this.notificationChannelId,
        text: '📋 Trusselmodellering-bestillinger liste må opprettes',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📋 Opprett Trusselmodellering-bestillinger liste',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Trusselmodellering-bestillinger listen er ikke konfigurert ennå.*\n\nTrykk på knappen nedenfor for å opprette en ny liste som vil brukes til å administrere alle trusselmodellering-forespørsler.'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✨ Listen vil automatisk opprettes med:\n• Prosjektnavn\n• Forespørsels-ID\n• Status\n• Prioritet\n• Tildelt til\n• Forespurt av\n• Type trusselmodellering'
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '🚀 Opprett liste nå',
                  emoji: true
                },
                style: 'primary',
                action_id: 'create_threatmodeling_list'
              }
            ]
          }
        ]
      });
      logger.success('Create list message sent to notification channel');
    } catch (error) {
      logger.error('Error sending create list message:', error);
    }
  }

  async handleCreateListButton(userId) {
    try {
      logger.info(`User ${userId} triggered list creation`);

      await this.createNewList();
      await this.shareListAccess();

      await this.client.chat.postMessage({
        channel: this.notificationChannelId,
        text: '✅ Trusselmodellering-bestillinger liste opprettet!',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '✅ Liste opprettet!',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Trusselmodellering-bestillinger* listen er nå klar! 🎉\n\nListen er delt med denne kanalen.'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📋 *Liste-ID:* \`${this.listId}\``
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '⚠️ *VIKTIG:* Legg til følgende i `.env` filen for å bevare listen ved omstart:'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `\`\`\`THREAT_MODELING_LIST_ID=${this.listId}\`\`\``
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Opprettet av <@${userId}> | ${new Date().toLocaleString('nb-NO')}`
              }
            ]
          }
        ]
      });

      logger.success('List created and configured successfully');
      return this.listId;
    } catch (error) {
      logger.error('Error creating list:', error);
      await this.client.chat.postMessage({
        channel: this.notificationChannelId,
        text: '❌ Feil ved oppretting av liste',
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
      throw error;
    }
  }

  /**
   * Create a new Slack List with the predefined schema
   * @returns {Promise<string>} The new list ID
   * @throws {RequestProcessingError} When list creation fails
   */
  async createNewList() {
    this.logger.info('Creating new Trusselmodellering-bestillinger list...');

    const result = await this.apiService.createList({
      name: LIST_NAME,
      channel_id: this.notificationChannelId,
      schema: LIST_SCHEMA
    });

    const newListId = result.list_id;
    if (!newListId) {
      throw new RequestProcessingError(
        'List created but response missing list_id',
        null,
        'createNewList'
      );
    }

    this.listId = newListId;
    const schema = result.list_metadata?.schema || [];
    this.registerColumnIds(schema);

    this.logger.success(`List created successfully with ID: ${newListId}`);

    await this.createDummyItem();
    return newListId;
  }

  /**
   * Make a Slack API call using the service layer
   * @deprecated Use apiService methods directly instead
   * @param {string} method - Slack API method
   * @param {Object} params - API parameters
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} API response
   */
  async callSlackApi(method, params, context = {}) {
    return this.apiService.call(method, params, context);
  }

  registerColumnIds(schema = []) {
    if (!Array.isArray(schema) || schema.length === 0) {
      return false;
    }

    this.resetColumnIds();

    schema.forEach((column) => {
      if (!column || (!column.key && !column.name)) {
        return;
      }

      const alias = COLUMN_ALIAS_BY_KEY[column.key] || COLUMN_ALIAS_BY_NAME[column.name];
      if (alias) {
        this.setColumnId(alias, column.id || null);
      }
    });

    logger.debug('Column map initialized from schema', this.getColumnStateForLog());
    return true;
  }

  registerColumnIdsFromItem(item) {
    if (!item || !Array.isArray(item.fields)) {
      return false;
    }

    this.resetColumnIds();

    item.fields.forEach((field) => {
      if (!field) return;
      const alias = COLUMN_ALIAS_BY_KEY[field.key] || COLUMN_ALIAS_BY_NAME[field.name];
      if (!alias) return;

      const columnId = field.column_id || field.id || null;
      this.setColumnId(alias, columnId);
    });

    logger.debug('Column map reconstructed from list item', this.getColumnStateForLog());
    return true;
  }

  async loadListSchema() {
    try {
      const { schema, items } = await this.fetchSchemaViaItemsList();

      if (schema && this.registerColumnIds(schema)) {
        logger.success('Column IDs loaded from list metadata');
        return;
      }

      if (items && items.length > 0 && this.registerColumnIdsFromItem(items[0])) {
        logger.warn('Column IDs inferred from existing list item metadata');
        return;
      }

      throw new Error('Cannot load column IDs from list. Ensure list has metadata or recreate it.');
    } catch (error) {
      logger.error('Error loading list schema:', error.message);
      throw error;
    }
  }

  // Removed: fetchSchemaViaInfo (slackLists.info is not supported)

  async fetchSchemaViaItemsList() {
    try {
      const result = await this.callSlackApi('slackLists.items.list', {
        list_id: this.listId,
        limit: 10
      });

      return {
        schema: result.list_metadata?.schema || null,
        items: result.items || []
      };
    } catch (error) {
      logger.debug('slackLists.items.list failed while loading schema', { error: error.message });
      return { schema: null, items: [] };
    }
  }

  async createDummyItem() {
    if (!this.listId || !this.projectColumnId || !this.requestIdColumnId || !this.statusColumnId) {
      logger.debug('Skipping dummy item creation - required columns missing');
      return;
    }

    try {
      logger.info('Creating dummy item to establish list metadata');
      const botInfo = await this.callSlackApi('auth.test', {});
      const botUserId = botInfo.user_id;

      const fields = [
        buildRichTextField(this.projectColumnId, '📋 Eksempel - Slett denne raden'),
        buildRichTextField(this.requestIdColumnId, 'DEMO-000'),
        {
          column_id: this.statusColumnId,
          select: ['pending']
        },
        this.urgencyColumnId
          ? {
            column_id: this.urgencyColumnId,
            select: ['low']
          }
          : null,
        this.threatModelingTypeColumnId
          ? {
            column_id: this.threatModelingTypeColumnId,
            select: ['other']
          }
          : null,
        this.requestedByColumnId
          ? {
            column_id: this.requestedByColumnId,
            user: [botUserId]
          }
          : null,
        this.assignedToColumnId
          ? {
            column_id: this.assignedToColumnId,
            user: [botUserId]
          }
          : null,
        this.adminMessageTsColumnId
          ? buildRichTextField(this.adminMessageTsColumnId, DEFAULT_ADMIN_MESSAGE_PLACEHOLDER)
          : null
      ].filter(Boolean);

      await this.callSlackApi('slackLists.items.create', {
        list_id: this.listId,
        initial_fields: fields
      });

      logger.success('Dummy list item created. It can be deleted manually.');
    } catch (error) {
      logger.warn('Could not create dummy list item', { error: error.message });
    }
  }

  async shareListAccess() {
    if (!this.listId) {
      return;
    }

    logger.info('Sharing list with notification channel and users');

    try {
      await this.callSlackApi('slackLists.access.set', {
        list_id: this.listId,
        channel_ids: [this.notificationChannelId],
        access_level: 'write'
      });
      logger.success(`List shared with channel ${this.notificationChannelId}`);
    } catch (error) {
      logger.error('Unable to share list with channel', { error: error.message });
    }

    try {
      await this.client.chat.postMessage({
        channel: this.notificationChannelId,
        text: '📋 Trusselmodellering-bestillinger',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '📋 Trusselmodellering-bestillinger er klart!'
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Listen *Trusselmodellering-bestillinger* er nå aktiv og delt! Alle trusselmodellering-forespørsler vil automatisk vises her.'
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Liste-ID: \`${this.listId}\` | Delt med denne kanalen`
              }
            ]
          }
        ]
      });
      logger.success('List share notification posted to notification channel');
    } catch (error) {
      logger.error('Failed to post share notification', { error: error.message });
    }
  }

  buildRequestFields(requestId, requestData) {
    const fields = [];

    if (this.projectColumnId) {
      fields.push(buildRichTextField(this.projectColumnId, requestData.projectName || ''));
    }

    if (this.requestIdColumnId) {
      fields.push(buildRichTextField(this.requestIdColumnId, requestId));
    }

    if (this.statusColumnId) {
      fields.push({
        column_id: this.statusColumnId,
        select: [REQUEST_TO_LIST_STATUS.pending]
      });
    }

    if (this.urgencyColumnId) {
      fields.push({
        column_id: this.urgencyColumnId,
        select: [requestData.urgency || 'unknown']
      });
    }

    if (this.requestedByColumnId && requestData.requestedBy) {
      fields.push({
        column_id: this.requestedByColumnId,
        user: [requestData.requestedBy]
      });
    }

    if (this.threatModelingTypeColumnId) {
      fields.push({
        column_id: this.threatModelingTypeColumnId,
        select: [requestData.threatModelingType || 'other']
      });
    }

    if (this.assignedToColumnId && Array.isArray(requestData.assignedTo) && requestData.assignedTo.length > 0) {
      fields.push({
        column_id: this.assignedToColumnId,
        user: requestData.assignedTo
      });
    }

    if (this.adminMessageTsColumnId && requestData.adminMessageTs) {
      fields.push(buildRichTextField(this.adminMessageTsColumnId, requestData.adminMessageTs));
    }

    return fields;
  }

  async addRequest(requestId, requestData) {
    validateRequestId(requestId);
    validateRequestData(requestData);

    if (!this.listId) {
      throw new ConfigurationError('List not initialized, cannot add request');
    }

    try {
      const initialFields = this.buildRequestFields(requestId, requestData);

      const result = await this.callSlackApi('slackLists.items.create', {
        list_id: this.listId,
        initial_fields: initialFields
      });

      const itemId = result.item?.id || null;
      if (!itemId) {
        throw new RequestProcessingError(
          'Failed to create list item: no item ID returned',
          requestId,
          'addRequest'
        );
      }

      this.logger.success(`Request ${requestId} added to list`, { itemId });
      return itemId;
    } catch (error) {
      if (error instanceof SlackAPIError || error instanceof RequestProcessingError) {
        throw error;
      }
      throw new RequestProcessingError(
        `Failed to add request to list: ${error.message}`,
        requestId,
        'addRequest'
      );
    }
  }

  mapStatusForList(status) {
    return REQUEST_TO_LIST_STATUS[status] || REQUEST_TO_LIST_STATUS.pending;
  }

  async updateRequestStatus(requestId, listItemId, newStatus) {
    if (!this.listId || !this.statusColumnId) {
      logger.warn('List not initialized, cannot update status');
      return false;
    }

    try {
      const listStatus = this.mapStatusForList(newStatus);
      await this.callSlackApi('slackLists.items.update', {
        list_id: this.listId,
        cells: [
          {
            row_id: listItemId,
            column_id: this.statusColumnId,
            select: [listStatus]
          }
        ]
      });

      logger.success(`Request ${requestId} status updated`, { status: newStatus, listStatus });
      return true;
    } catch (error) {
      logger.error('Error updating request status in list:', error);
      return false;
    }
  }

  async updateAssignedUsers(requestId, listItemId, userIds) {
    if (!this.listId || !this.assignedToColumnId) {
      logger.warn('List not initialized, cannot update assigned users');
      return false;
    }

    try {
      await this.callSlackApi('slackLists.items.update', {
        list_id: this.listId,
        cells: [
          {
            row_id: listItemId,
            column_id: this.assignedToColumnId,
            user: Array.isArray(userIds) ? userIds : []
          }
        ]
      });

      logger.success(`Assigned users updated for request ${requestId}`);
      return true;
    } catch (error) {
      logger.error('Error updating assigned users in list:', error);
      return false;
    }
  }

  async getListItems() {
    if (!this.listId) {
      logger.warn('List not initialized, cannot get items');
      return [];
    }

    try {
      const result = await this.callSlackApi('slackLists.items.list', {
        list_id: this.listId
      });

      const items = result.items || [];
      logger.debug(`Retrieved ${items.length} items from list`);
      return items;
    } catch (error) {
      logger.error('Error getting list items:', error);
      return [];
    }
  }

  setListId(listId, columnIds = null) {
    this.listId = listId;

    if (columnIds && typeof columnIds === 'object') {
      const legacyMap = {
        project: 'projectName',
        projectName: 'projectName',
        requestId: 'requestId',
        status: 'status',
        urgency: 'urgency',
        assignedTo: 'assignedTo',
        requestedBy: 'requestedBy',
        threatModelingType: 'threatModelingType',
        adminMessageTs: 'adminMessageTs'
      };

      Object.entries(legacyMap).forEach(([key, alias]) => {
        if (Object.prototype.hasOwnProperty.call(columnIds, key) && columnIds[key]) {
          this.setColumnId(alias, columnIds[key]);
        }
      });
    }

    logger.info(`List ID set to: ${listId}`);
  }
}

module.exports = SlackListsManager;
