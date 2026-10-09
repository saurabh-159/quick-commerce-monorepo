const sendResponse = require('../utils/apiResponse');

/**
 * @param {import('joi').ObjectSchema} schema
 * @param {'body'|'query'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const payload = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(payload, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return sendResponse(res, 400, false, errorMessage, null);
    }

    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }
    next();
  };
};

module.exports = validate;
