const VERBOSE = process.env.VERBOSE === 'true' || process.env.LOG_LEVEL === 'debug';

class Logger {
  log(message, ...args) {
    console.log(`[LOG] ${new Date().toISOString()} - ${message}`, ...args);
  }

  info(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  debug(message, ...args) {
    if (VERBOSE) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }

  success(message, ...args) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ✅ ${message}`, ...args);
  }

  action(actionId, userId, metadata = {}) {
    this.debug(`Action triggered: ${actionId}`, { userId, ...metadata });
  }

  command(commandName, userId, channelId) {
    this.debug(`Command invoked: ${commandName}`, { userId, channelId });
  }

  modal(callbackId, userId, action = 'opened') {
    this.debug(`Modal ${action}: ${callbackId}`, { userId });
  }

  redis(operation, key, result = null) {
    this.debug(`Redis ${operation}: ${key}`, result ? { result } : {});
  }

  slack(operation, details = {}) {
    this.debug(`Slack API: ${operation}`, details);
  }
}

module.exports = new Logger();
