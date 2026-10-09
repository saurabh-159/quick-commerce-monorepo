const cartService = require('../services/cart.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getCartByUser(req.user.sub);
  return sendResponse(res, 200, true, 'Cart fetched successfully', cart);
});

const addToCart = asyncHandler(async (req, res) => {
  const { productId, storeId, qty } = req.body;
  const cart = await cartService.addItemToCart(req.user.sub, productId, storeId, qty);
  return sendResponse(res, 200, true, 'Item added to cart', cart);
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { qty } = req.body;
  const cart = await cartService.updateCartItemQty(req.user.sub, productId, qty);
  return sendResponse(res, 200, true, 'Cart updated successfully', cart);
});

const emptyCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user.sub);
  return sendResponse(res, 200, true, 'Cart cleared successfully', null);
});

module.exports = { getCart, addToCart, updateCartItem, emptyCart };