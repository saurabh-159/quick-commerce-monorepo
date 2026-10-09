const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: process.env.PORT || 5000,
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'change_me_access',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000'
};