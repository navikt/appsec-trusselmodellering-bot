const config = require('../config');
const logger = require('../logger');
const { RequestActionHandlers } = require('../handlers/actions');

/**
 * Factory for creating and configuring threat modeling application components
 * Simplified for automated threat modeling workflow - no Slack Lists or complex admin approval needed
 */
class ApplicationFactory {
  /**
   * Create a minimal action handlers instance for threat modeling
   * @param {Object} app - Slack Bolt app
   * @param {Object} overrides - Override default configuration
   * @returns {RequestActionHandlers} Configured handlers (simplified)
   */
  static createActionHandlers(app, overrides = {}) {
    const handlerConfig = {
      notificationChannelId: overrides.notificationChannelId || config.notificationChannelId
    };

    const dependencies = {
      logger: overrides.logger || logger
    };

    return new RequestActionHandlers(app, handlerConfig, dependencies);
  }

  /**
   * Create threat modeling application components
   * @param {Object} app - Slack Bolt app instance
   * @param {Object} overrides - Configuration overrides for testing
   * @returns {Object} Configured components for threat modeling workflow
   */
  static createApplication(app, overrides = {}) {
    const actionHandlers = ApplicationFactory.createActionHandlers(app, overrides);

    return {
      actionHandlers,
      config: overrides.config || config,
      logger: overrides.logger || logger
    };
  }
}

module.exports = ApplicationFactory;