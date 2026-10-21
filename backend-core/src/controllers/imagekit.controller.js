const imagekitService = require('../services/imagekit.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getAuth = asyncHandler(async (req, res) => {
  const auth = imagekitService.getUploadAuth();
  if (!auth) {
    return sendResponse(
      res,
      503,
      false,
      'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.',
      null
    );
  }
  return sendResponse(res, 200, true, 'ImageKit auth ready', auth);
});

module.exports = { getAuth };
