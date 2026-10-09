const addressService = require('../services/address.service');
const sendResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

const addAddress = asyncHandler(async (req, res) => {
  const address = await addressService.createAddress(req.user.sub, req.body);
  return sendResponse(res, 201, true, 'Address added successfully', address);
});

const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getUserAddresses(req.user.sub);
  return sendResponse(res, 200, true, 'Addresses fetched successfully', addresses);
});

const removeAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user.sub, req.params.id);
  return sendResponse(res, 200, true, 'Address deleted successfully', null);
});

module.exports = { addAddress, getAddresses, removeAddress };