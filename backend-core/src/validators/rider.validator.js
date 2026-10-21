const Joi = require('joi');

const phone = Joi.string().pattern(/^[0-9]{10}$/).required();
const vehicleType = Joi.string().valid('bike', 'cycle', 'ev').required();

const createRiderSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  phone,
  email: Joi.string().trim().lowercase().email().allow('').optional(),
  password: Joi.string().min(8).max(72).required(),
  vehicleType
});

const updateRiderSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  phone,
  email: Joi.string().trim().lowercase().email().allow('').optional(),
  password: Joi.string().min(8).max(72).allow('').optional(),
  vehicleType,
  isActive: Joi.boolean().required(),
  isOnline: Joi.boolean().optional()
});

module.exports = {
  createRiderSchema,
  updateRiderSchema
};
