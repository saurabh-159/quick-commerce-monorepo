const homeService = require('../services/home.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getHome = asyncHandler(async (req, res) => {
  const data = await homeService.getHome(req.query);
  return sendResponse(res, 200, true, data.message, data);
});

module.exports = { getHome };
