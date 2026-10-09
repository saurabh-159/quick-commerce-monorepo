const storeService = require('../services/store.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getNearbyStore = asyncHandler(async (req, res) => {
  const { lat, lng } = req.query;
  const result = await storeService.findNearestStore(lat, lng);
  return sendResponse(res, 200, true, 'Nearest store found', result);
});

const createStore = asyncHandler(async (req, res) => {
  const store = await storeService.createStore(req.body);
  return sendResponse(res, 201, true, 'Store created successfully', store);
});

const getStores = asyncHandler(async (req, res) => {
  const stores = await storeService.getAllStores();
  return sendResponse(res, 200, true, 'Stores fetched successfully', stores);
});

module.exports = { getNearbyStore, createStore, getStores };
