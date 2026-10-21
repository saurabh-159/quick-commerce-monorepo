const Joi = require('joi');

const nearbySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

const catalogQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).optional(),
  lng: Joi.number().min(-180).max(180).optional(),
  category: Joi.string().trim().max(80).allow('').optional()
});

const inventoryUpdateSchema = Joi.object({
  storeId: Joi.string().hex().length(24).required(),
  productId: Joi.string().hex().length(24).required(),
  stock: Joi.number().min(0).required(),
  sellingPricePaise: Joi.number().min(0).required(),
  description: Joi.string().allow('').optional(),
  images: Joi.array().items(Joi.string().trim()).optional()
});

module.exports = { nearbySchema, catalogQuerySchema, inventoryUpdateSchema };