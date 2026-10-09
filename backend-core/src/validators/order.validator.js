const Joi = require('joi');

const createOrderSchema = Joi.object({
  addressId: Joi.string().hex().length(24).required(),
  paymentMethod: Joi.string().valid('cod', 'online').required()
});

module.exports = { createOrderSchema };