const Joi = require('joi');

const addressSchema = Joi.object({
  label: Joi.string().optional(),
  line1: Joi.string().required(),
  line2: Joi.string().allow('').optional(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().length(6).required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  isDefault: Joi.boolean().optional()
});

module.exports = { addressSchema };