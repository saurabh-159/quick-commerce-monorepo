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
  const { storeId, productId, stock, sellingPricePaise, description, images } = req.body;
  const inv = await catalogService.updateInventory(storeId, productId, stock, sellingPricePaise, {
    description,
    images
  });
  return sendResponse(res, 200, true, 'Inventory updated successfully', inv);
});

const createCategory = asyncHandler(async (req, res) => {
  const cat = await catalogService.createCategory(req.body);
  return sendResponse(res, 201, true, 'Category created successfully', cat);
});

const listAllCategories = asyncHandler(async (req, res) => {
  const categories = await catalogService.listAllCategories();
  return sendResponse(res, 200, true, 'Categories fetched successfully', categories);
});

const getCategory = asyncHandler(async (req, res) => {
  const category = await catalogService.getCategoryById(req.params.id);
  if (!category) return sendResponse(res, 404, false, 'Category not found', null);
  return sendResponse(res, 200, true, 'Category fetched successfully', category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await catalogService.updateCategory(req.params.id, req.body);
  if (!category) return sendResponse(res, 404, false, 'Category not found', null);
  return sendResponse(res, 200, true, 'Category updated successfully', category);
});

const deleteCategory = asyncHandler(async (req, res) => {
  const result = await catalogService.deleteCategory(req.params.id);
  if (result.status === 'missing') return sendResponse(res, 404, false, 'Category not found', null);
  if (result.status === 'in_use') {
    return sendResponse(res, 400, false, 'This category is used by products. Delete or move those products first.', null);
  }
  return sendResponse(res, 200, true, 'Category deleted successfully', { id: result.category._id });
});

const listInventory = asyncHandler(async (req, res) => {
  const rows = await catalogService.listInventory();
  return sendResponse(res, 200, true, 'Inventory fetched successfully', rows);
});

const getInventory = asyncHandler(async (req, res) => {
  const row = await catalogService.getInventoryById(req.params.id);
  if (!row) return sendResponse(res, 404, false, 'Inventory not found', null);
  return sendResponse(res, 200, true, 'Inventory fetched successfully', row);
});

const updateInventoryById = asyncHandler(async (req, res) => {
  const { stock, sellingPricePaise } = req.body;
  const row = await catalogService.updateInventoryById(req.params.id, stock, sellingPricePaise);
  if (!row) return sendResponse(res, 404, false, 'Inventory not found', null);
  return sendResponse(res, 200, true, 'Inventory updated successfully', row);
});

const deleteInventory = asyncHandler(async (req, res) => {
  const row = await catalogService.deleteInventory(req.params.id);
  if (!row) return sendResponse(res, 404, false, 'Inventory not found', null);
  return sendResponse(res, 200, true, 'Inventory deleted successfully', { id: row._id });
});

const createProduct = asyncHandler(async (req, res) => {
  const prod = await catalogService.createProduct(req.body);
  return sendResponse(res, 201, true, 'Product created successfully', prod);
});

const listAllProducts = asyncHandler(async (req, res) => {
  const products = await catalogService.listAllProducts();
  return sendResponse(res, 200, true, 'All products fetched successfully', products);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await catalogService.getProductById(req.params.id);
  if (!product) return sendResponse(res, 404, false, 'Product not found', null);
  return sendResponse(res, 200, true, 'Product fetched successfully', product);
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await catalogService.updateProduct(req.params.id, req.body);
  if (!product) return sendResponse(res, 404, false, 'Product not found', null);
  return sendResponse(res, 200, true, 'Product updated successfully', product);
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await catalogService.deleteProduct(req.params.id);
  if (!product) return sendResponse(res, 404, false, 'Product not found', null);
  return sendResponse(res, 200, true, 'Product deleted successfully', { id: product._id });
});

module.exports = {
  getCategories,
  getProducts,
  updateInventory,
  createCategory,
  listAllCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  listAllProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  listInventory,
  getInventory,
  updateInventoryById,
  deleteInventory
};