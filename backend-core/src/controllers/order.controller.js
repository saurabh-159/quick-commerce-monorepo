const orderService = require('../services/order.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod } = req.body;
  const order = await orderService.createOrderFromCart(req.user.sub, addressId, paymentMethod);
  return sendResponse(res, 201, true, 'Order created successfully', order);
});

const getOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getOrdersByUser(req.user.sub, req.user.role);
  return sendResponse(res, 200, true, 'Orders fetched successfully', orders);
});

const getOrderDetails = asyncHandler(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user.sub, req.user.role);
  return sendResponse(res, 200, true, 'Order fetched successfully', order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user.sub);
  return sendResponse(res, 200, true, 'Order cancelled successfully', order);
});

module.exports = { createOrder, getOrders, getOrderDetails, cancelOrder };