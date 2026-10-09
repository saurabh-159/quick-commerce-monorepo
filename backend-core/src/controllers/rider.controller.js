const riderService = require('../services/rider.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const setOnlineStatus = asyncHandler(async (req, res) => {
  const { isOnline } = req.body;
  const rider = await riderService.updateRiderOnlineStatus(req.user.sub, isOnline);
  return sendResponse(res, 200, true, 'Rider online status updated', rider);
});

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const rider = await riderService.updateRiderLocation(req.user.sub, lat, lng);
  return sendResponse(res, 200, true, 'Rider location updated', rider);
});

const getAssignments = asyncHandler(async (req, res) => {
  const orders = await riderService.getRiderAssignments(req.user.sub);
  return sendResponse(res, 200, true, 'Rider assignments fetched', orders);
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await riderService.updateRiderOrderStatus(req.params.id, req.user.sub, status);
  return sendResponse(res, 200, true, 'Order status updated successfully', order);
});

const adminAssignRider = asyncHandler(async (req, res) => {
  const { riderId } = req.body;
  const Order = require('../models/Order');
  const order = await Order.findById(req.params.id);
  if (!order) throw new Error('Order not found');

  order.rider = riderId;
  order.status = 'assigned';
  order.statusHistory.push({ status: 'assigned', note: 'Manually assigned by admin' });
  await order.save();

  return sendResponse(res, 200, true, 'Rider assigned by admin', order);
});

module.exports = {
  setOnlineStatus,
  updateLocation,
  getAssignments,
  updateOrderStatus,
  adminAssignRider
};