const logger = require('../logger');

/**
 * Custom error types for different failure scenarios
 */

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, code = 'APP_ERROR', context = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Slack API related errors
 */
class SlackAPIError extends AppError {
  constructor(message, method = null, params = null, slackError = null) {
    super(message, 'SLACK_API_ERROR', { method, params, slackError });
    this.method = method;
    this.slackError = slackError;
  }
}

/**
 * Configuration or setup errors
 */
class ConfigurationError extends AppError {
  constructor(message, missingConfig = null) {
    super(message, 'CONFIGURATION_ERROR', { missingConfig });
    this.missingConfig = missingConfig;
  }
}

/**
 * Request processing errors
 */
class RequestProcessingError extends AppError {
  constructor(message, requestId = null, operation = null) {
    super(message, 'REQUEST_PROCESSING_ERROR', { requestId, operation });
    this.requestId = requestId;
    this.operation = operation;
  }
}

/**
 * Storage/persistence related errors
 */
class StorageError extends AppError {
  constructor(message, operation = null, key = null) {
    super(message, 'STORAGE_ERROR', { operation, key });
    this.operation = operation;
    this.key = key;
  }
}

/**
 * Centralized error handling with consistent logging and response formatting
 */
class ErrorHandler {
  /**
   * Handle an error with appropriate logging and context
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context for logging
   * @returns {Object} Standardized error response
   */
  static handle(error, context = {}) {
    const errorInfo = {
      name: error.name || 'UnknownError',
      message: error.message,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: error.timestamp || new Date().toISOString(),
      context: { ...error.context, ...context }
    };

    if (error instanceof ConfigurationError) {
      logger.error('Configuration error', errorInfo);
    } else if (error instanceof SlackAPIError) {
      logger.error('Slack API error', {
        ...errorInfo,
        method: error.method,
        slackError: error.slackError
      });
    } else if (error instanceof RequestProcessingError) {
      logger.error('Request processing error', {
        ...errorInfo,
        requestId: error.requestId,
        operation: error.operation
      });
    } else if (error instanceof StorageError) {
      logger.error('Storage error', {
        ...errorInfo,
        operation: error.operation,
        key: error.key
      });
    } else {
      logger.error('Unexpected error', errorInfo);
    }

    return {
      success: false,
      error: {
        code: errorInfo.code,
        message: errorInfo.message,
        timestamp: errorInfo.timestamp
      }
    };
  }

  /**
   * Wrap async functions with error handling
   * @param {Function} fn - The async function to wrap
   * @param {Object} defaultContext - Default context for errors
   * @returns {Function} Wrapped function with error handling
   */
  static async wrap(fn, defaultContext = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return ErrorHandler.handle(error, defaultContext);
      }
    };
  }

  /**
   * Create a user-friendly error message for Slack
   * @param {Error} error - The error to format
   * @returns {string} User-friendly error message
   */
  static formatForUser(error) {
    if (error instanceof ConfigurationError) {
      return '⚙️ Det oppstod en konfigurasjonsfeil. Kontakt support.';
    }

    if (error instanceof SlackAPIError) {
      return '📡 Kommunikasjonsfeil med Slack. Prøv igjen om litt.';
    }

    if (error instanceof RequestProcessingError) {
      return '📋 Kunne ikke behandle forespørselen. Prøv igjen eller kontakt support.';
    }

    if (error instanceof StorageError) {
      return '💾 Kunne ikke lagre data. Prøv igjen om litt.';
    }

    return '❌ Det oppstod en uventet feil. Kontakt support hvis problemet vedvarer.';
  }

  /**
   * Retry logic for operations that might fail temporarily
   * @param {Function} operation - The operation to retry
   * @param {Object} options - Retry configuration
   * @returns {Promise} Result of the operation
   */
  static async retry(operation, options = {}) {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 1.5,
      shouldRetry = () => true
    } = options;

    let lastError;
    let currentDelay = delay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
          throw error;
        }

        logger.warn(`Operation failed, retrying in ${currentDelay}ms`, {
          attempt,
          maxAttempts,
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= backoff;
      }
    }

    throw lastError;
  }
}

/**
 * Predefined retry configurations for common scenarios
 */
const RetryConfigs = {
  slackAPI: {
    maxAttempts: 3,
    delay: 1000,
    backoff: 2,
    shouldRetry: (error, attempt) => {
      if (!(error instanceof SlackAPIError)) {
        return false;
      }

      const retryableErrors = new Set([
        'rate_limited',
        'ratelimited',
        'internal_error',
        'network_error',
        'timeout',
        'service_unavailable',
        'gateway_timeout',
        'server_error'
      ]);

      return retryableErrors.has(error.slackError);
    }
  },

  storage: {
    maxAttempts: 2,
    delay: 500,
    backoff: 1.5,
    shouldRetry: (error, attempt) => {
      return error instanceof StorageError && attempt < 2;
    }
  },

  network: {
    maxAttempts: 3,
    delay: 2000,
    backoff: 2,
    shouldRetry: (error, attempt) => {
      return error.code === 'NETWORK_ERROR' ||
        error.code === 'TIMEOUT' ||
        attempt < 3;
    }
  }
};

module.exports = {
  AppError,
  SlackAPIError,
  ConfigurationError,
  RequestProcessingError,
  StorageError,
  ErrorHandler,
  RetryConfigs
};