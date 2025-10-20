const config = require('../config');
const logger = require('../logger');
const store = require('../store');
const SlackListsManager = require('../lists');
const { RequestActionHandlers } = require('../handlers/actions');
const SlackAPIService = require('../services/slackAPI');

/**
 * Factory for creating and configuring application components
 * Centralizes dependency injection and configuration
 */
class ApplicationFactory {
  /**
   * Create a configured SlackListsManager instance
   * @param {Object} slackClient - Slack Bolt client
   * @param {Object} overrides - Override default configuration
   * @returns {SlackListsManager} Configured lists manager
   */
  static createListsManager(slackClient, overrides = {}) {
    const dependencies = {
      logger: overrides.logger || logger,
      apiService: overrides.apiService || new SlackAPIService(slackClient, {
        logger: overrides.logger || logger
      })
    };

    return new SlackListsManager(
      slackClient,
      overrides.adminChannelId || config.adminChannelId,
      overrides.orderListId || config.orderListId,
      overrides.adminUserIds || config.adminUserIds,
      dependencies
    );
  }

  /**
   * Create a configured action handlers instance
   * @param {Object} app - Slack Bolt app
   * @param {SlackListsManager} listsManager - Lists manager instance
   * @param {Object} overrides - Override default configuration
   * @returns {RequestActionHandlers} Configured handlers
   */
  static createActionHandlers(app, listsManager, overrides = {}) {
    const handlerConfig = {
      adminChannelId: overrides.adminChannelId || config.adminChannelId,
      adminUserIds: overrides.adminUserIds || config.adminUserIds
    };

    const dependencies = {
      logger: overrides.logger || logger,
      store: overrides.store || store
    };

    return new RequestActionHandlers(app, listsManager, handlerConfig, dependencies);
  }

  /**
   * Create a Slack API service instance
   * @param {Object} slackClient - Slack client
   * @param {Object} overrides - Override default configuration
   * @returns {SlackAPIService} Configured API service
   */
  static createSlackAPIService(slackClient, overrides = {}) {
    const dependencies = {
      logger: overrides.logger || logger
    };

    return new SlackAPIService(slackClient, dependencies);
  }

  /**
   * Create all application components with proper wiring
   * @param {Object} app - Slack Bolt app instance
   * @param {Object} overrides - Configuration overrides for testing
   * @returns {Object} All configured components
   */
  static createApplication(app, overrides = {}) {
    const apiService = ApplicationFactory.createSlackAPIService(app.client, overrides);

    const listsManager = ApplicationFactory.createListsManager(app.client, {
      ...overrides,
      apiService
    });

    const actionHandlers = ApplicationFactory.createActionHandlers(app, listsManager, overrides);

    return {
      apiService,
      listsManager,
      actionHandlers,
      config: overrides.config || config,
      logger: overrides.logger || logger,
      store: overrides.store || store
    };
  }
}

module.exports = ApplicationFactory;