const logger = require('../logger');

/**
 * Custom validation error with context
 */
class ValidationError extends Error {
  constructor(message, field = null, value = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Validates a Slack user ID format
 * @param {string} userId - The user ID to validate
 * @param {string} fieldName - Name of the field for error context
 * @throws {ValidationError} If user ID is invalid
 */
const validateUserId = (userId, fieldName = 'userId') => {
  if (!userId || typeof userId !== 'string') {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName, userId);
  }
  
  if (!/^[A-Z0-9]{9,11}$/i.test(userId)) {
    throw new ValidationError(`${fieldName} must be a valid Slack user ID format`, fieldName, userId);
  }
  
  return userId;
};

/**
 * Validates a Slack channel ID format
 * @param {string} channelId - The channel ID to validate
 * @param {string} fieldName - Name of the field for error context
 * @throws {ValidationError} If channel ID is invalid
 */
const validateChannelId = (channelId, fieldName = 'channelId') => {
  if (!channelId || typeof channelId !== 'string') {
    throw new ValidationError(`${fieldName} must be a non-empty string`, fieldName, channelId);
  }
  
  if (!/^[C][A-Z0-9]{8,10}$/i.test(channelId)) {
    throw new ValidationError(`${fieldName} must be a valid Slack channel ID format`, fieldName, channelId);
  }
  
  return channelId;
};



/**
 * Validates an array of user IDs
 * @param {Array} userIds - Array of user IDs to validate
 * @param {string} fieldName - Name of the field for error context
 * @param {boolean} allowEmpty - Whether empty arrays are allowed
 * @throws {ValidationError} If array or any user ID is invalid
 */
const validateUserIdArray = (userIds, fieldName = 'userIds', allowEmpty = false) => {
  if (!Array.isArray(userIds)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, userIds);
  }
  
  if (!allowEmpty && userIds.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName, userIds);
  }
  
  userIds.forEach((userId, index) => {
    try {
      validateUserId(userId, `${fieldName}[${index}]`);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(
        `Invalid user ID at ${fieldName}[${index}]: ${error.message}`, 
        `${fieldName}[${index}]`, 
        userId
      );
    }
  });
  
  return userIds;
};

/**
 * Validates basic request data for threat modeling
 * @param {Object} requestData - The request data to validate
 * @throws {ValidationError} If request data is invalid
 */
const validateRequestData = (requestData) => {
  if (!requestData || typeof requestData !== 'object') {
    throw new ValidationError('Request data must be an object', 'requestData', requestData);
  }
  
  const requiredFields = ['projectName', 'requestedBy'];
  
  requiredFields.forEach(field => {
    if (!requestData[field] || typeof requestData[field] !== 'string') {
      throw new ValidationError(
        `${field} is required and must be a non-empty string`, 
        field, 
        requestData[field]
      );
    }
  });
  
  validateUserId(requestData.requestedBy, 'requestedBy');
  
  if (requestData.teamMembers) {
    validateUserIdArray(requestData.teamMembers, 'teamMembers', true);
  }
  
  return requestData;
};



/**
 * Safe wrapper for validation functions that logs errors
 * @param {Function} validationFn - The validation function to wrap
 * @param {*} value - The value to validate
 * @param {...*} args - Additional arguments for the validation function
 * @returns {*} The validated value or null if validation fails
 */
const safeValidate = (validationFn, value, ...args) => {
  try {
    return validationFn(value, ...args);
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.error('Validation failed', {
        field: error.field,
        value: error.value,
        message: error.message
      });
    } else {
      logger.error('Unexpected validation error', { error: error.message });
    }
    return null;
  }
};

/**
 * Validates and sanitizes a project name for channel creation
 * @param {string} projectName - The project name to sanitize
 * @returns {string} Sanitized project name
 */
const sanitizeProjectName = (projectName) => {
  if (!projectName || typeof projectName !== 'string') {
    return 'prosjekt';
  }
  
  return projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40) || 'prosjekt';
};

module.exports = {
  ValidationError,
  validateUserId,
  validateChannelId,
  validateUserIdArray,
  validateRequestData,
  safeValidate,
  sanitizeProjectName
};