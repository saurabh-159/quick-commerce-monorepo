const authService = require('../services/auth.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  return sendResponse(res, 201, true, 'User registered successfully', result);
});

const login = asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const result = await authService.loginUser(phone, password);
  return sendResponse(res, 200, true, 'Login successful', result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshAccessToken(refreshToken);
  return sendResponse(res, 200, true, 'Token refreshed successfully', result);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getUserProfile(req.user.sub);
  return sendResponse(res, 200, true, 'Profile fetched successfully', user);
});

module.exports = {
  register,
  login,
  refresh,
  getMe
};