const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createOrderSchema } = require('../validators/order.validator');

router.use(protect);

router.post('/', validate(createOrderSchema), orderController.createOrder);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderDetails);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;