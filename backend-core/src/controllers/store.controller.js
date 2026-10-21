const mongoose = require('mongoose');
const storeService = require('../services/store.service');
const storefrontService = require('../services/storefront.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

function validId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

const getStoreCatalog = asyncHandler(async (req, res) => {
  if (!validId(req.params.id)) return sendResponse(res, 400, false, 'Invalid store id', null);
  const data = await storefrontService.getStoreCatalog(req.params.id, req.query);
  if (!data) return sendResponse(res, 404, false, 'Store not found', null);
  return sendResponse(res, 200, true, data.message, data);
});

const getStoreProduct = asyncHandler(async (req, res) => {
  if (!validId(req.params.id) || !validId(req.params.productId)) {
    return sendResponse(res, 400, false, 'Invalid id', null);
  }
  const data = await storefrontService.getStoreProduct(req.params.id, req.params.productId, req.query);
  if (!data) return sendResponse(res, 404, false, 'Product not found in this store', null);
  return sendResponse(res, 200, true, 'Product fetched successfully', data);
});

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

const getStore = asyncHandler(async (req, res) => {
  const store = await storeService.getStoreById(req.params.id);
  if (!store) return sendResponse(res, 404, false, 'Store not found', null);
  return sendResponse(res, 200, true, 'Store fetched successfully', store);
});

const updateStore = asyncHandler(async (req, res) => {
  const store = await storeService.updateStore(req.params.id, req.body);
  if (!store) return sendResponse(res, 404, false, 'Store not found', null);
  return sendResponse(res, 200, true, 'Store updated successfully', store);
});

const deleteStore = asyncHandler(async (req, res) => {
  const store = await storeService.deleteStore(req.params.id);
  if (!store) return sendResponse(res, 404, false, 'Store not found', null);
  return sendResponse(res, 200, true, 'Store deleted successfully', { id: store._id });
});

module.exports = {
  getNearbyStore,
  getStoreCatalog,
  getStoreProduct,
  createStore,
  getStores,
  getStore,
  updateStore,
  deleteStore
};
