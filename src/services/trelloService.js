const config = require('../config');
const logger = require('../logger');

class TrelloService {
  constructor() {
    this.apiKey = config.trello.apiKey;
    this.apiToken = config.trello.apiToken;
    this.listId = config.trello.listId;
  }

  async createCard(name, description) {
    const url = 'https://api.trello.com/1/cards';
    
    const body = {
      key: this.apiKey,
      token: this.apiToken,
      idList: this.listId,
      name: name,
      desc: description
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status} ${response.statusText}`);
      }

      const card = await response.json();
      logger.info(`Trello card created: ${card.shortUrl}`);
      return card;
    } catch (error) {
      logger.error('Failed to create Trello card:', error);
      throw error;
    }
  }
}

module.exports = TrelloService;
