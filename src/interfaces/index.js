/**
 * Storage interface for persisting request data
 * @interface IRequestStorage
 */
class IRequestStorage {
  /**
   * Save a request to storage
   * @param {string} requestId - Unique identifier for the request
   * @param {Object} requestData - The request data to save
   * @returns {Promise<boolean>} True if saved successfully
   */
  async saveRequest(requestId, requestData) {
    throw new Error('saveRequest method must be implemented');
  }

  /**
   * Retrieve a request from storage
   * @param {string} requestId - Unique identifier for the request
   * @returns {Promise<Object|null>} The request data or null if not found
   */
  async getRequest(requestId) {
    throw new Error('getRequest method must be implemented');
  }

  /**
   * Update an existing request
   * @param {string} requestId - Unique identifier for the request
   * @param {Object} updateData - The data to update
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateRequest(requestId, updateData) {
    throw new Error('updateRequest method must be implemented');
  }

  /**
   * Delete a request from storage
   * @param {string} requestId - Unique identifier for the request
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteRequest(requestId) {
    throw new Error('deleteRequest method must be implemented');
  }

  /**
   * Get requests by status
   * @param {string} status - The status to filter by
   * @returns {Promise<Array>} Array of requests with the specified status
   */
  async getRequestsByStatus(status) {
    throw new Error('getRequestsByStatus method must be implemented');
  }
}

/**
 * Slack API interface for handling Slack operations
 * @interface ISlackAPI
 */
class ISlackAPI {
  /**
   * Send a message to a channel
   * @param {string} channelId - The channel to send to
   * @param {Object} messageData - The message data
   * @returns {Promise<Object>} The message response
   */
  async sendMessage(channelId, messageData) {
    throw new Error('sendMessage method must be implemented');
  }

  /**
   * Update an existing message
   * @param {string} channelId - The channel containing the message
   * @param {string} timestamp - The message timestamp
   * @param {Object} messageData - The updated message data
   * @returns {Promise<Object>} The update response
   */
  async updateMessage(channelId, timestamp, messageData) {
    throw new Error('updateMessage method must be implemented');
  }

  /**
   * Create a conversation
   * @param {Object} options - Conversation creation options
   * @returns {Promise<Object>} The conversation data
   */
  async createConversation(options) {
    throw new Error('createConversation method must be implemented');
  }

  /**
   * Invite users to a conversation
   * @param {string} channelId - The channel to invite to
   * @param {Array<string>} userIds - User IDs to invite
   * @returns {Promise<Object>} The invitation response
   */
  async inviteToConversation(channelId, userIds) {
    throw new Error('inviteToConversation method must be implemented');
  }

  /**
   * Open a modal view
   * @param {string} triggerId - The trigger ID from the interaction
   * @param {Object} viewData - The modal view data
   * @returns {Promise<Object>} The modal response
   */
  async openModal(triggerId, viewData) {
    throw new Error('openModal method must be implemented');
  }
}

/**
 * List manager interface for handling Slack Lists
 * @interface IListManager
 */
class IListManager {
  /**
   * Initialize the list
   * @returns {Promise<string|null>} The list ID or null if not ready
   */
  async initializeList() {
    throw new Error('initializeList method must be implemented');
  }

  /**
   * Add a request to the list
   * @param {string} requestId - Unique identifier for the request
   * @param {Object} requestData - The request data
   * @returns {Promise<string|null>} The list item ID or null if failed
   */
  async addRequest(requestId, requestData) {
    throw new Error('addRequest method must be implemented');
  }

  /**
   * Update the status of a request in the list
   * @param {string} requestId - Unique identifier for the request
   * @param {string} listItemId - The list item ID
   * @param {string} newStatus - The new status
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateRequestStatus(requestId, listItemId, newStatus) {
    throw new Error('updateRequestStatus method must be implemented');
  }

  /**
   * Update assigned users for a request
   * @param {string} requestId - Unique identifier for the request
   * @param {string} listItemId - The list item ID
   * @param {Array<string>} userIds - Array of user IDs
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateAssignedUsers(requestId, listItemId, userIds) {
    throw new Error('updateAssignedUsers method must be implemented');
  }
}

/**
 * Logger interface for consistent logging
 * @interface ILogger
 */
class ILogger {
  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {Object} [context] - Additional context
   */
  info(message, context = {}) {
    throw new Error('info method must be implemented');
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {Object} [context] - Additional context
   */
  warn(message, context = {}) {
    throw new Error('warn method must be implemented');
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {Object} [context] - Additional context
   */
  error(message, context = {}) {
    throw new Error('error method must be implemented');
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   * @param {Object} [context] - Additional context
   */
  debug(message, context = {}) {
    throw new Error('debug method must be implemented');
  }

  /**
   * Log a success message
   * @param {string} message - The message to log
   * @param {Object} [context] - Additional context
   */
  success(message, context = {}) {
    throw new Error('success method must be implemented');
  }
}

module.exports = {
  IRequestStorage,
  ISlackAPI,
  IListManager,
  ILogger
};