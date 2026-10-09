const jwt = require('jsonwebtoken');
const { jwtAccessSecret, jwtRefreshSecret, jwtAccessExpires, jwtRefreshExpires } = require('../config/env');

const generateAccessToken = (userId, role) => {
  return jwt.sign({ sub: userId, role }, jwtAccessSecret, { expiresIn: jwtAccessExpires });
};

const generateRefreshToken = (userId, role) => {
  return jwt.sign({ sub: userId, role }, jwtRefreshSecret, { expiresIn: jwtRefreshExpires });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, jwtAccessSecret);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtRefreshSecret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken
};