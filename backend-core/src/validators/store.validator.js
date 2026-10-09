const Joi = require('joi');

const nearbySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

const inventoryUpdateSchema = Joi.object({
  storeId: Joi.string().hex().length(24).required(),
  productId: Joi.string().hex().length(24).required(),
  stock: Joi.number().min(0).required(),
  sellingPricePaise: Joi.number().min(0).required()
});

module.exports = { nearbySchema, inventoryUpdateSchema };