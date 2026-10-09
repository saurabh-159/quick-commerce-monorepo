const Redis = require('ioredis');
const { redisUrl } = require('../config/env');

const redisPub = new Redis(redisUrl);

redisPub.on('error', (err) => {
  console.error('❌ Redis Publisher Error:', err);
});

const publishEvent = async (eventData) => {
  try {
    await redisPub.publish('qc:events', JSON.stringify(eventData));
  } catch (error) {
    console.error('Failed to publish Redis event:', error.message);
  }
};

module.exports = { publishEvent };