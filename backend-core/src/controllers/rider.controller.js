const riderService = require('../services/rider.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const sendServiceResult = async (res, work, success) => {
  try {
    const data = await work();
    if (data == null) return sendResponse(res, 404, false, 'Rider not found', null);
    return sendResponse(res, success.status, true, success.message, data);
  } catch (error) {
    if (error.statusCode) return sendResponse(res, error.statusCode, false, error.message, null);
    throw error;
  }
};

const setOnlineStatus = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.updateRiderOnlineStatus(req.user.sub, req.body.isOnline), {
    status: 200,
    message: 'Rider online status updated'
  });
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

const listRiders = asyncHandler(async (req, res) => {
  const riders = await riderService.listAdminRiders();
  return sendResponse(res, 200, true, 'Riders fetched successfully', riders);
});

const getRider = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.getAdminRider(req.params.id), {
    status: 200,
    message: 'Rider fetched successfully'
  });
});

const createRider = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.createAdminRider(req.body), {
    status: 201,
    message: 'Rider created successfully'
  });
});

const updateRider = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.updateAdminRider(req.params.id, req.body), {
    status: 200,
    message: 'Rider updated successfully'
  });
});

const listRiderOrders = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.listAdminRiderOrders(req.params.id), {
    status: 200,
    message: 'Rider orders fetched successfully'
  });
});

const placeRiderNearStore = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.placeRiderNearStore(req.params.id), {
    status: 200,
    message: 'Rider placed near shop'
  });
});

const placeRidersNearAllStores = asyncHandler(async (req, res) => {
  const placed = await riderService.placeRidersNearAllStores();
  return sendResponse(res, 200, true, 'Riders placed near every shop', placed);
});

const adminAssignRider = asyncHandler(async (req, res) => {
  return sendServiceResult(res, () => riderService.assignRiderToOrder(req.params.id, req.body.riderId), {
    status: 200,
    message: 'Order assigned successfully'
  });
});

module.exports = {
  setOnlineStatus,
  updateLocation,
  getAssignments,
  updateOrderStatus,
  listRiders,
  getRider,
  createRider,
  updateRider,
  listRiderOrders,
  adminAssignRider,
  placeRiderNearStore,
  placeRidersNearAllStores
};
