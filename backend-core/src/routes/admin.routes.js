const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const catalogController = require('../controllers/catalog.controller');
const { protect, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { inventoryUpdateSchema } = require('../validators/store.validator');

// All admin routes require token and admin role
router.use(protect, allowRoles('admin'));

router.post('/stores', storeController.createStore);
router.get('/stores', storeController.getStores);
router.post('/categories', catalogController.createCategory);
router.post('/products', catalogController.createProduct);
router.put('/inventory', validate(inventoryUpdateSchema), catalogController.updateInventory);

module.exports = router;