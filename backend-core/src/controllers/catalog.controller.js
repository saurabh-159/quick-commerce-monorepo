const catalogService = require('../services/catalog.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getCategories = asyncHandler(async (req, res) => {
  const categories = await catalogService.getCategories();
  return sendResponse(res, 200, true, 'Categories fetched successfully', categories);
});

const getProducts = asyncHandler(async (req, res) => {
  const { storeId, categoryId, q } = req.query;
  if (!storeId) {
    return sendResponse(res, 400, false, 'storeId query parameter is required', null);
  }
  const products = await catalogService.getProductsByStore(storeId, categoryId, q);
  return sendResponse(res, 200, true, 'Products fetched successfully', products);
});

const updateInventory = asyncHandler(async (req, res) => {
  const { storeId, productId, stock, sellingPricePaise } = req.body;
  const inv = await catalogService.updateInventory(storeId, productId, stock, sellingPricePaise);
  return sendResponse(res, 200, true, 'Inventory updated successfully', inv);
});

const createCategory = asyncHandler(async (req, res) => {
  const cat = await catalogService.createCategory(req.body);
  return sendResponse(res, 201, true, 'Category created successfully', cat);
});

const createProduct = asyncHandler(async (req, res) => {
  const prod = await catalogService.createProduct(req.body);
  return sendResponse(res, 201, true, 'Product created successfully', prod);
});

module.exports = {
  getCategories,
  getProducts,
  updateInventory,
  createCategory,
  createProduct
};