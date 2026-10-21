const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { nearbySchema, catalogQuerySchema } = require('../validators/store.validator');
const validate = require('../middleware/validate');
const rateLimit = require('../middleware/rateLimit');

const limit = rateLimit({ windowMs: 60 * 1000, max: 80 });

router.get('/nearby', validate(nearbySchema, 'query'), storeController.getNearbyStore);
router.get('/:id/products/:productId', limit, validate(catalogQuerySchema, 'query'), storeController.getStoreProduct);
router.get('/:id/catalog', limit, validate(catalogQuerySchema, 'query'), storeController.getStoreCatalog);

module.exports = router;