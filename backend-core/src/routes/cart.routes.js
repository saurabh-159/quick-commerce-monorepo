const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addToCartSchema, updateCartItemSchema } = require('../validators/cart.validator');

router.use(protect);

router.get('/', cartController.getCart);
router.post('/items', validate(addToCartSchema), cartController.addToCart);
router.patch('/items/:productId', validate(updateCartItemSchema), cartController.updateCartItem);
router.delete('/', cartController.emptyCart);

module.exports = router;