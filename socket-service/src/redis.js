const Redis = require('ioredis');
const { redisUrl } = require('./config');

const pubClient = new Redis(redisUrl);
const subClient = pubClient.duplicate();

subClient.on('error', (err) => {
  console.error('❌ Redis Sub Error:', err);
});

pubClient.on('error', (err) => {
  console.error('❌ Redis Pub Error:', err);
});

module.exports = { pubClient, subClient };