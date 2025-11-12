// This file is no longer needed for the automated threat modeling workflow.
// All functionality is handled directly in commands.js when the user submits the modal.
// The bot automatically creates Trello cards and posts notifications without requiring approval.

module.exports = function registerActions(app, slackListsManager, config = {}) {
  // No actions to register - threat modeling requests are processed automatically
  return {};
};

module.exports.RequestActionHandlers = class RequestActionHandlers {
  constructor() {}
  register() {}
};
