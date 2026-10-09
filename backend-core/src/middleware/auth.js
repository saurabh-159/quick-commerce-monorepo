const sendResponse = require('../utils/apiResponse');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendResponse(res, 401, false, 'Not authorized, token missing', null);
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded; // { sub: userId, role }
    next();
  } catch (error) {
    return sendResponse(res, 401, false, 'Not authorized, token failed', null);
  }
};

const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendResponse(res, 403, false, 'Forbidden: You do not have access to this resource', null);
    }
    next();
  };
};

module.exports = {
  protect,
  allowRoles
};