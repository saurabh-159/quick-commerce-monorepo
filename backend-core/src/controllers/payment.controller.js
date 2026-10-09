const paymentService = require('../services/payment.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const mockPaymentSuccess = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  const result = await paymentService.mockOnlinePaymentSuccess(req.user.sub, orderId);
  return sendResponse(res, 200, true, 'Payment successful and order confirmed', result);
});

module.exports = { mockPaymentSuccess };