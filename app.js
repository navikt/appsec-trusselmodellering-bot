require('dotenv').config();
const { App } = require('@slack/bolt');
const config = require('./src/config');
const store = require('./src/store');
const ApplicationFactory = require('./src/factories/applicationFactory');
const logger = require('./src/logger');
const { buildAppHomeView } = require('./src/messages');
const { getThreatModelingRequestModal } = require('./src/modals');

const app = new App({
  ...config.slackApp,
  port: config.port,
  customRoutes: [
    {
      path: '/internal/is_alive',
      method: ['GET'],
      handler: async (req, res) => {
        if (res && typeof res.status === 'function' && typeof res.send === 'function') {
          res.status(200).send('OK');
        } else if (res) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('OK');
        }
      }
    }
  ]
});

const { actionHandlers } = ApplicationFactory.createApplication(app);

require('./src/handlers/commands')(app, config);
actionHandlers.register();

app.event('app_home_opened', async ({ event, client, logger: boltLogger }) => {
  try {
    const userId = event.user;

    await client.views.publish({ user_id: userId, view: buildAppHomeView(userId, []) });
  } catch (error) {
    (boltLogger || logger).error('Failed to publish App Home', error);
  }
});

app.action('request_threatmodeling', async ({ ack, body, client }) => {
  await ack();
  try {
    await client.views.open({
      trigger_id: body.trigger_id,
      view: getThreatModelingRequestModal()
    });
  } catch (error) {
    logger.error('Error opening threat modeling modal from App Home:', error);
  }
});

(async () => {
  try {
    // Initialize simplified threat modeling store
    await store.connect();
    
    const healthy = await store.healthCheck();
    if (!healthy) {
      console.error('Threat Modeling Store health check failed. Exiting...');
      process.exit(1);
    }

    await app.start(config.port);
    
    console.log('⚡️ Threat Modeling Slack app is running!');

    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);
      await store.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start threat modeling app:', error);
    process.exit(1);
  }
})();