const Joi = require('joi');

const addToCartSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  storeId: Joi.string().hex().length(24).required(),
  qty: Joi.number().integer().min(1).required()
});

const updateCartItemSchema = Joi.object({
  qty: Joi.number().integer().min(0).required() // 0 means remove item
});

module.exports = { addToCartSchema, updateCartItemSchema };