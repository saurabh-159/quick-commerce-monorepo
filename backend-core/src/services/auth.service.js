const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/tokens');

const registerUser = async (userData) => {
  const { name, phone, email, password } = userData;

  const existingUser = await User.findOne({ phone });
  if (existingUser) {
    throw new Error('User with this phone number already exists');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await User.create({
    name,
    phone,
    email,
    passwordHash,
    role: 'customer' // Public registration is always customer
  });

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  return {
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    accessToken,
    refreshToken
  };
};

const loginUser = async (phone, password) => {
  const user = await User.findOne({ phone });
  if (!user || !user.isActive) {
    throw new Error('Invalid phone number or password');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid phone number or password');
  }

  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id, user.role);

  return {
    user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    accessToken,
    refreshToken
  };
};

const refreshAccessToken = async (token) => {
  try {
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
    throw new Error('Invalid refresh token');
    }

    const accessToken = generateAccessToken(user._id, user.role);
    return { accessToken };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  getUserProfile
};