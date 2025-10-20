const { SlackAPIError, ErrorHandler, RetryConfigs } = require('../utils/errorHandling');

/**
 * Service layer for Slack API operations
 */
class SlackAPIService {
  /**
   * Creates a new Slack API service
   * @param {Object} client - Slack client instance
   * @param {Object} dependencies - Dependency injection
   * @param {Object} dependencies.logger - Logger instance
   * @param {Object} dependencies.errorHandler - Error handler instance
   */
  constructor(client, dependencies = {}) {
    if (!client) {
      throw new Error('Slack client is required');
    }
    
    this.client = client;
    this.logger = dependencies.logger || console;
    this.errorHandler = dependencies.errorHandler || ErrorHandler;
  }

  /**
   * Make a Slack API call with retry logic and error handling
   * @param {string} method - Slack API method name
   * @param {Object} params - Parameters for the API call
   * @param {Object} context - Additional context for logging
   * @returns {Promise<Object>} API response
   * @throws {SlackAPIError} When API call fails
   */
  async call(method, params, context = {}) {
    return this.errorHandler.retry(async () => {
      try {
        this.logger.debug?.(`Calling Slack API: ${method}`, { method, context });
        
        const response = await this.client.apiCall(method, params);
        
        if (!response || response.ok === false) {
          const slackError = response && response.error ? response.error : 'unknown_error';
          throw new SlackAPIError(
            `Slack API call failed: ${method} - ${slackError}`,
            method,
            params,
            slackError
          );
        }
        
        this.logger.debug?.(`Slack API call successful: ${method}`, { method, context });
        return response;
      } catch (error) {
        if (error instanceof SlackAPIError) {
          throw error;
        }

        // Try to extract Slack platform error codes from Web API errors
        const slackPlatformError = 
          (error && error.data && error.data.error) ||
          (typeof error.code === 'string' ? error.code : null) ||
          (typeof error.message === 'string' && /unknown_method/i.test(error.message)
            ? 'unknown_method'
            : null);

        const mappedErrorCode = slackPlatformError || 'network_error';

        // Re-throw as standardized SlackAPIError so retry policy can decide
        throw new SlackAPIError(
          `${slackPlatformError ? 'Slack API error' : 'Network error'} calling ${method}: ${error.message}`,
          method,
          params,
          mappedErrorCode
        );
      }
    }, RetryConfigs.slackAPI);
  }

  /**
   * Send a message to a channel
   * @param {string} channelId - Channel to send message to
   * @param {Object} messageData - Message content and formatting
   * @returns {Promise<Object>} Message response with timestamp
   */
  async sendMessage(channelId, messageData) {
    return this.call('chat.postMessage', {
      channel: channelId,
      ...messageData
    }, { operation: 'sendMessage', channelId });
  }

  /**
   * Update an existing message
   * @param {string} channelId - Channel containing the message
   * @param {string} timestamp - Message timestamp
   * @param {Object} messageData - Updated message content
   * @returns {Promise<Object>} Update response
   */
  async updateMessage(channelId, timestamp, messageData) {
    return this.call('chat.update', {
      channel: channelId,
      ts: timestamp,
      ...messageData
    }, { operation: 'updateMessage', channelId, timestamp });
  }

  /**
   * Delete a message
   * @param {string} channelId - Channel containing the message
   * @param {string} timestamp - Message timestamp
   * @returns {Promise<Object>} Deletion response
   */
  async deleteMessage(channelId, timestamp) {
    return this.call('chat.delete', {
      channel: channelId,
      ts: timestamp
    }, { operation: 'deleteMessage', channelId, timestamp });
  }

  /**
   * Create a new conversation (channel)
   * @param {Object} options - Conversation creation options
   * @param {string} options.name - Channel name
   * @param {boolean} options.is_private - Whether channel is private
   * @returns {Promise<Object>} Conversation data
   */
  async createConversation(options) {
    return this.call('conversations.create', options, { 
      operation: 'createConversation', 
      name: options.name 
    });
  }

  /**
   * Invite users to a conversation
   * @param {string} channelId - Channel to invite users to
   * @param {string|Array<string>} users - User ID(s) to invite
   * @returns {Promise<Object>} Invitation response
   */
  async inviteToConversation(channelId, users) {
    const userIds = Array.isArray(users) ? users.join(',') : users;
    return this.call('conversations.invite', {
      channel: channelId,
      users: userIds
    }, { operation: 'inviteToConversation', channelId, userCount: Array.isArray(users) ? users.length : 1 });
  }

  /**
   * Set conversation topic
   * @param {string} channelId - Channel ID
   * @param {string} topic - New topic text
   * @returns {Promise<Object>} Response
   */
  async setConversationTopic(channelId, topic) {
    return this.call('conversations.setTopic', {
      channel: channelId,
      topic
    }, { operation: 'setConversationTopic', channelId });
  }

  /**
   * Set conversation purpose
   * @param {string} channelId - Channel ID
   * @param {string} purpose - New purpose text
   * @returns {Promise<Object>} Response
   */
  async setConversationPurpose(channelId, purpose) {
    return this.call('conversations.setPurpose', {
      channel: channelId,
      purpose
    }, { operation: 'setConversationPurpose', channelId });
  }

  /**
   * Open a modal view
   * @param {string} triggerId - Trigger ID from interaction
   * @param {Object} view - Modal view definition
   * @returns {Promise<Object>} Modal response
   */
  async openModal(triggerId, view) {
    return this.call('views.open', {
      trigger_id: triggerId,
      view
    }, { operation: 'openModal', triggerId });
  }

  /**
   * Get user info
   * @param {string} userId - User ID to get info for
   * @returns {Promise<Object>} User information
   */
  async getUserInfo(userId) {
    return this.call('users.info', {
      user: userId
    }, { operation: 'getUserInfo', userId });
  }

  /**
   * Get bot's authentication info
   * @returns {Promise<Object>} Auth test response
   */
  async getAuthInfo() {
    return this.call('auth.test', {}, { operation: 'getAuthInfo' });
  }

  /**
   * Create a Slack List
   * @param {Object} options - List creation options
   * @param {string} options.name - List name
   * @param {string} options.channel_id - Channel to create list in
   * @param {Array} options.schema - List schema definition
   * @returns {Promise<Object>} List creation response
   */
  async createList(options) {
    return this.call('slackLists.create', options, { 
      operation: 'createList', 
      name: options.name 
    });
  }

  /**
   * List items in a Slack List
   * @param {string} listId - List ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Maximum items to return
   * @returns {Promise<Object>} List items response
   */
  async listItems(listId, options = {}) {
    return this.call('slackLists.items.list', {
      list_id: listId,
      ...options
    }, { operation: 'listItems', listId });
  }

  /**
   * Create an item in a Slack List
   * @param {string} listId - List ID
   * @param {Array} initialFields - Initial field values
   * @returns {Promise<Object>} Item creation response
   */
  async createListItem(listId, initialFields) {
    return this.call('slackLists.items.create', {
      list_id: listId,
      initial_fields: initialFields
    }, { operation: 'createListItem', listId });
  }

  /**
   * Update items in a Slack List
   * @param {string} listId - List ID
   * @param {Array} cells - Cell updates
   * @returns {Promise<Object>} Update response
   */
  async updateListItems(listId, cells) {
    return this.call('slackLists.items.update', {
      list_id: listId,
      cells
    }, { operation: 'updateListItems', listId, cellCount: cells.length });
  }

  /**
   * Set list access permissions
   * @param {string} listId - List ID
   * @param {Object} options - Access options
   * @param {Array<string>} options.channel_ids - Channel IDs to grant access
   * @param {Array<string>} options.user_ids - User IDs to grant access
   * @param {string} options.access_level - Access level (read/write)
   * @returns {Promise<Object>} Access response
   */
  async setListAccess(listId, options) {
    return this.call('slackLists.access.set', {
      list_id: listId,
      ...options
    }, { operation: 'setListAccess', listId });
  }
}

module.exports = SlackAPIService;