const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalog.controller');

router.get('/categories', catalogController.getCategories);
router.get('/products', catalogController.getProducts);

module.exports = router;