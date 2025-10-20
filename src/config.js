const logger = require('./logger');

const REQUIRED_ENV_VARS = [
	'SLACK_BOT_TOKEN',
	'SIGNING_SECRET',
	'SOCKET_MODE_TOKEN',
	'ADMIN_CHANNEL_ID'
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
	logger.error('Missing required environment variables', missing);
	throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const parseCsv = (value) =>
	value
		? value
				.split(',')
				.map((entry) => entry.trim())
				.filter(Boolean)
		: [];

const parsePort = (value, fallback = 3000) => {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const config = {
	port: parsePort(process.env.PORT),
	adminChannelId: process.env.ADMIN_CHANNEL_ID,
	adminUserIds: parseCsv(process.env.ADMIN_USER_IDS),
	orderListId: process.env.ORDER_LIST_ID || null,
	slackApp: {
		token: process.env.SLACK_BOT_TOKEN,
		signingSecret: process.env.SIGNING_SECRET,
		appToken: process.env.SOCKET_MODE_TOKEN,
		socketMode: true
	}
};

module.exports = config;
