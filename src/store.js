const logger = require('./logger');

class ThreatModelingStore {
  constructor() {
    this.requestCache = new Map();
  }

  async connect() {
    logger.info('Initializing Threat Modeling Store...');
    logger.success('Threat Modeling Store ready - using in-memory cache for temporary data');
  }

  // Temporarily cache threat modeling request data during processing
  async cacheRequestData(requestId, data) {
    logger.debug(`Caching threat modeling request: ${requestId}`, { 
    });

    this._updateCache(requestId, {
      systemDescription: data.systemDescription || '',
      threatModelingType: data.threatModelingType || '',
      priority: data.priority || '',
      additionalInfo: data.additionalInfo || '',
      requestedBy: data.requestedBy,
      requestedAt: data.requestedAt || new Date().toISOString(),
      teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : []
    });

    logger.debug(`Threat modeling request cached: ${requestId}`);
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

  // Get cached threat modeling request data
  async getCachedRequestData(requestId) {
    logger.debug(`Retrieving cached request data: ${requestId}`);
    return this.requestCache.get(requestId) || null;
  }

  // Update cached data with Trello card URL after card creation
  async updateTrelloCardUrl(requestId, trelloCardUrl) {
    logger.debug(`Adding Trello card URL to request: ${requestId}`, { trelloCardUrl });
    
    const existingData = this.requestCache.get(requestId);
    if (!existingData) {
      logger.warn(`No cached data found for request ${requestId}, cannot add Trello URL`);
      return false;
    }

    this._updateCache(requestId, {
      trelloCardUrl: trelloCardUrl,
      trelloCardCreatedAt: new Date().toISOString()
    });

    logger.debug(`Trello card URL added to request: ${requestId}`);
    return true;
  }

  // Clear cached data after processing (cleanup)
  async clearRequestData(requestId) {
    logger.debug(`Clearing cached request data: ${requestId}`);
    this.requestCache.delete(requestId);
  }

  async healthCheck() {
    try {
      logger.success('Threat Modeling Store health check passed');
      return true;
    } catch (error) {
      logger.error('Threat Modeling Store health check failed:', error);
      return false;
    }
  }

  async close() {
    logger.info('Threat Modeling Store shutting down...');
    this.requestCache.clear();
    logger.success('Threat Modeling Store closed');
  }
}

module.exports = new ThreatModelingStore();
