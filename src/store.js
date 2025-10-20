const logger = require('./logger');
const {
  REQUEST_TO_LIST_STATUS,
  LIST_TO_REQUEST_STATUS,
  URGENCY_LABELS,
  PENTEST_TYPE_LABELS
} = require('./constants/lists');
const { richTextToPlainText, createRichText } = require('./utils/slackRichText');

class SlackStore {
  constructor() {
    this.listsManager = null;
    this.client = null;
    this.requestCache = new Map();
  }

  async connect(listsManager, slackClient) {
    logger.info('Initializing Slack Store...');
    this.listsManager = listsManager;
    this.client = slackClient;
    logger.success('Slack Store ready - using Slack Lists as source of truth');
  }

  _getFieldValue(item, columnId, type = 'text') {
    if (!item || !Array.isArray(item.fields)) {
      return type === 'user' ? [] : null;
    }

    const field = item.fields.find((f) => f.column_id === columnId);
    if (!field) {
      return type === 'user' ? [] : null;
    }

    switch (type) {
      case 'text':
        return richTextToPlainText(field.rich_text);

      case 'select':
        return Array.isArray(field.select) && field.select.length > 0 ? field.select[0] : null;

      case 'user':
        return Array.isArray(field.user) ? field.user : [];

      default:
        return null;
    }
  }

  async saveRequest(requestId, data) {
    if (!this.listsManager || !this.listsManager.listId) {
      logger.error('Lists Manager not initialized');
      throw new Error('Lists Manager not initialized');
    }

    logger.debug(`Saving request to Slack List: ${requestId}`, { 
      status: data.status, 
      projectName: data.projectName 
    });

    try {
      let listItemId = data.listItemId || null;

      if (listItemId) {
        await this._updateListItem(listItemId, requestId, data);
      } else {
        listItemId = await this.listsManager.addRequest(requestId, data);
      }

      this._updateCache(requestId, {
        targetScope: data.targetScope || '',
        additionalInfo: data.additionalInfo || '',
        fullReport: data.fullReport || '',
        contactEmail: data.contactEmail || '',
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        requestedAt: data.requestedAt || new Date().toISOString(),
        teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : [],
        pentestTypeText: data.pentestTypeText,
        urgencyText: data.urgencyText,
        channelId: data.channelId,
        pentestType: data.pentestType,
        urgency: data.urgency,
        jiraTicketUrl: data.jiraTicketUrl,
        currentStatus: data.status || 'pending',
        status: data.status || 'pending',
        listItemId
      });

      logger.success(`Request saved to Slack List: ${requestId}`);
      return listItemId;
    } catch (error) {
      logger.error(`Error saving request ${requestId}:`, error);
      throw error;
    }
  }

  async _updateListItem(listItemId, requestId, data) {
    if (!listItemId) {
      return;
    }

    const cells = [];

    if (data.status && this.listsManager.statusColumnId) {
      const statusForList = REQUEST_TO_LIST_STATUS[data.status] || REQUEST_TO_LIST_STATUS.pending;
      cells.push({
        row_id: listItemId,
        column_id: this.listsManager.statusColumnId,
        select: [statusForList]
      });
    }

    if (Array.isArray(data.assignedTo) && this.listsManager.assignedToColumnId) {
      cells.push({
        row_id: listItemId,
        column_id: this.listsManager.assignedToColumnId,
        user: data.assignedTo
      });
    }

    if (typeof data.adminMessageTs === 'string' && this.listsManager.adminMessageTsColumnId) {
      cells.push({
        row_id: listItemId,
        column_id: this.listsManager.adminMessageTsColumnId,
        rich_text: createRichText(data.adminMessageTs)
      });
    }

    if (cells.length === 0) {
      return;
    }

    await this.client.apiCall('slackLists.items.update', {
      list_id: this.listsManager.listId,
      cells
    });
  }

  _updateCache(requestId, updates = {}) {
    const existing = this.requestCache.get(requestId) || {};
    const merged = { ...existing };

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        merged[key] = value;
      }
    });

    this.requestCache.set(requestId, merged);
  }

  async _findListItemId(requestId) {
    const items = await this.listsManager.getListItems();
    const item = items.find((entry) => {
      const itemRequestId = this._getFieldValue(entry, this.listsManager.requestIdColumnId, 'text');
      return itemRequestId === requestId;
    });

    return item ? item.id : null;
  }

  async getRequest(requestId) {
    if (!this.listsManager || !this.listsManager.listId) {
      logger.error('Lists Manager not initialized');
      return null;
    }

    logger.debug(`Retrieving request from Slack List: ${requestId}`);

    try {
      const items = await this.listsManager.getListItems();

      const item = items.find((i) => {
        const itemRequestId = this._getFieldValue(i, this.listsManager.requestIdColumnId, 'text');
        return itemRequestId === requestId;
      });

      if (!item) {
        logger.warn(`Request not found in Slack List: ${requestId}`);
        return null;
      }

      const projectName = this._getFieldValue(item, this.listsManager.projectColumnId, 'text');
      const listStatus = this._getFieldValue(item, this.listsManager.statusColumnId, 'select');
      const urgency = this._getFieldValue(item, this.listsManager.urgencyColumnId, 'select');
      const assignedTo = this._getFieldValue(item, this.listsManager.assignedToColumnId, 'user');
      const requestedBy = this._getFieldValue(item, this.listsManager.requestedByColumnId, 'user');
      const pentestType = this._getFieldValue(item, this.listsManager.pentestTypeColumnId, 'select');
      const adminMessageTs = this._getFieldValue(item, this.listsManager.adminMessageTsColumnId, 'text');

      const cachedData = this.requestCache.get(requestId) || {};
      const normalizedStatus = LIST_TO_REQUEST_STATUS[listStatus] || cachedData.currentStatus || cachedData.status || 'pending';

      const urgencyText = cachedData.urgencyText || (urgency ? URGENCY_LABELS[urgency] : null) || 'Middels';
      const pentestTypeText = cachedData.pentestTypeText || (pentestType ? PENTEST_TYPE_LABELS[pentestType] : null) || 'Annet';

      const response = {
        projectName: projectName || '',
        status: normalizedStatus,
        urgency: urgency || cachedData.urgency || 'unknown',
        pentestType: pentestType || cachedData.pentestType || 'other',
        assignedTo: assignedTo || [],
        requestedBy: requestedBy && requestedBy.length > 0 ? requestedBy[0] : cachedData.requestedBy || '',
        listItemId: item.id || cachedData.listItemId || null,
        adminMessageTs: adminMessageTs || '',
        channelId: cachedData.channelId || '',
        targetScope: cachedData.targetScope || '',
        additionalInfo: cachedData.additionalInfo || '',
        fullReport: cachedData.fullReport || '',
        contactEmail: cachedData.contactEmail || '',
        approvedBy: cachedData.approvedBy || '',
        approvedAt: cachedData.approvedAt || '',
        requestedAt: cachedData.requestedAt || new Date().toISOString(),
        teamMembers: cachedData.teamMembers || [],
        pentestTypeText,
        urgencyText,
        currentStatus: cachedData.currentStatus || normalizedStatus,
        jiraTicketUrl: cachedData.jiraTicketUrl || ''
      };

      logger.debug(`Request found in Slack List: ${requestId}`, {
        status: response.status,
        projectName: response.projectName
      });

      this._updateCache(requestId, {
        ...cachedData,
        listItemId: response.listItemId,
        currentStatus: response.currentStatus,
        pentestTypeText,
        urgencyText,
        channelId: response.channelId,
        targetScope: response.targetScope,
        additionalInfo: response.additionalInfo,
        fullReport: response.fullReport,
        requestedAt: response.requestedAt,
        teamMembers: response.teamMembers,
        jiraTicketUrl: response.jiraTicketUrl
      });

      return response;

    } catch (error) {
      logger.error(`Error retrieving request ${requestId}:`, error);
      return null;
    }
  }
  // Update request fields
  async updateRequest(requestId, updates) {
    logger.debug(`Updating request: ${requestId}`, updates);

    this._updateCache(requestId, {
      targetScope: updates.targetScope,
      additionalInfo: updates.additionalInfo,
      fullReport: updates.fullReport,
      contactEmail: updates.contactEmail,
      approvedBy: updates.approvedBy,
      approvedAt: updates.approvedAt,
      teamMembers: Array.isArray(updates.teamMembers) ? updates.teamMembers : undefined,
      pentestTypeText: updates.pentestTypeText,
      urgencyText: updates.urgencyText,
      channelId: updates.channelId,
      pentestType: updates.pentestType,
      urgency: updates.urgency,
      jiraTicketUrl: updates.jiraTicketUrl,
      currentStatus: updates.currentStatus || updates.status,
      status: updates.status,
      adminMessageTs: updates.adminMessageTs
    });

    let listItemId = updates.listItemId || (this.requestCache.get(requestId) || {}).listItemId;

    if (!listItemId) {
      listItemId = await this._findListItemId(requestId);
      if (!listItemId) {
        logger.warn(`No list item found for ${requestId}, cannot update list`);
        return;
      }
      this._updateCache(requestId, { listItemId });
    }

    await this._updateListItem(listItemId, requestId, updates);
  }

  statusHistory = new Map();

  async addStatusHistory(requestId, statusData) {
    logger.debug(`Adding status history for ${requestId}`, statusData);
    
    const history = this.statusHistory.get(requestId) || [];
    history.unshift({
      status: statusData.status,
      statusText: statusData.statusText,
      updatedBy: statusData.updatedBy,
      note: statusData.note || '',
      timestamp: statusData.timestamp || new Date().toISOString()
    });
    this.statusHistory.set(requestId, history);
  }

  async getStatusHistory(requestId) {
    return this.statusHistory.get(requestId) || [];
  }

  async getRequestsByStatus(status) {
    if (!this.listsManager || !this.listsManager.listId) {
      logger.error('Lists Manager not initialized');
      return [];
    }

    logger.debug(`Getting requests with status: ${status}`);

    try {
      const items = await this.listsManager.getListItems();
      const requests = [];

      const listStatus = REQUEST_TO_LIST_STATUS[status] || status;

      for (const item of items) {
        const itemStatus = this._getFieldValue(item, this.listsManager.statusColumnId, 'select');
        
        if (itemStatus === listStatus) {
          const requestId = this._getFieldValue(item, this.listsManager.requestIdColumnId, 'text');
          const request = await this.getRequest(requestId);
          
          if (request) {
            requests.push({ id: requestId, ...request });
          }
        }
      }

      return requests;
    } catch (error) {
      logger.error('Error getting requests by status:', error);
      return [];
    }
  }

  async saveListConfig(config) {
    logger.debug('List configuration is managed by SlackListsManager');
  }

  async getListConfig() {
    if (!this.listsManager) return null;
    
    return {
      listId: this.listsManager.listId,
      statusColumnId: this.listsManager.statusColumnId,
      projectColumnId: this.listsManager.projectColumnId,
      requestIdColumnId: this.listsManager.requestIdColumnId,
      urgencyColumnId: this.listsManager.urgencyColumnId,
      assignedToColumnId: this.listsManager.assignedToColumnId,
      requestedByColumnId: this.listsManager.requestedByColumnId,
      pentestTypeColumnId: this.listsManager.pentestTypeColumnId
    };
  }

  async healthCheck() {
    try {
      if (!this.listsManager || !this.listsManager.listId) {
        logger.error('Lists Manager not initialized');
        return false;
      }

      await this.listsManager.getListItems();
      logger.success('Slack Store health check passed');
      return true;
    } catch (error) {
      logger.error('Slack Store health check failed:', error);
      return false;
    }
  }

  async close() {
    logger.info('Slack Store shutting down...');
    this.requestCache.clear();
    this.statusHistory.clear();
    logger.success('Slack Store closed');
  }
}

module.exports = new SlackStore();
