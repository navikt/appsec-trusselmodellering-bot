const logger = require('./logger');

const REQUIRED_ENV_VARS = [
	'SLACK_BOT_TOKEN',
	'SIGNING_SECRET',
	'SOCKET_MODE_TOKEN',
	'NOTIFICATION_CHANNEL_ID',
	'TRELLO_API_KEY',
	'TRELLO_API_TOKEN',
	'TRELLO_LIST_ID'
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
	logger.error('Missing required environment variables', missing);
	throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const parsePort = (value, fallback = 3000) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
	port: parsePort(process.env.PORT),
	notificationChannelId: process.env.NOTIFICATION_CHANNEL_ID,
	slackApp: {
		token: process.env.SLACK_BOT_TOKEN,
		signingSecret: process.env.SIGNING_SECRET,
		appToken: process.env.SOCKET_MODE_TOKEN,
		socketMode: true
	},
	trello: {
		apiKey: process.env.TRELLO_API_KEY,
		apiToken: process.env.TRELLO_API_TOKEN,
		listId: process.env.TRELLO_LIST_ID
	}
};

module.exports = config;
