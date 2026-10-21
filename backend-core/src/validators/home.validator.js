const Joi = require('joi');

const homeQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).default(28.6139),
  lng: Joi.number().min(-180).max(180).default(77.209),
  category: Joi.string().trim().max(80).allow('').default(''),
  q: Joi.string().trim().max(60).allow('').default('')
});

module.exports = { homeQuerySchema };
