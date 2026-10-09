const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');
const Joi = require('joi');
const validate = require('../middleware/validate');

const mockSchema = Joi.object({
  orderId: Joi.string().hex().length(24).required()
});

router.post('/online/mock-success', protect, validate(mockSchema), paymentController.mockPaymentSuccess);

module.exports = router;