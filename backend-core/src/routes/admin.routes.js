const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const catalogController = require('../controllers/catalog.controller');
const imagekitController = require('../controllers/imagekit.controller');
const riderController = require('../controllers/rider.controller');
const { protect, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { inventoryUpdateSchema } = require('../validators/store.validator');
const { createRiderSchema, updateRiderSchema } = require('../validators/rider.validator');

// All admin routes require token and admin role
router.use(protect, allowRoles('admin'));

router.get('/imagekit-auth', imagekitController.getAuth);

router.post('/stores', storeController.createStore);
router.get('/stores', storeController.getStores);
router.get('/stores/:id', storeController.getStore);
router.put('/stores/:id', storeController.updateStore);
router.delete('/stores/:id', storeController.deleteStore);
router.post('/categories', catalogController.createCategory);
router.get('/categories', catalogController.listAllCategories);
router.get('/categories/:id', catalogController.getCategory);
router.put('/categories/:id', catalogController.updateCategory);
router.delete('/categories/:id', catalogController.deleteCategory);
router.post('/products', catalogController.createProduct);
router.get('/products', catalogController.listAllProducts);
router.get('/products/:id', catalogController.getProduct);
router.put('/products/:id', catalogController.updateProduct);
router.delete('/products/:id', catalogController.deleteProduct);
router.get('/inventory', catalogController.listInventory);
router.put('/inventory', validate(inventoryUpdateSchema), catalogController.updateInventory);
router.get('/inventory/:id', catalogController.getInventory);
router.put('/inventory/:id', catalogController.updateInventoryById);
router.delete('/inventory/:id', catalogController.deleteInventory);
router.get('/riders', riderController.listRiders);
router.post('/riders', validate(createRiderSchema), riderController.createRider);
router.get('/riders/:id/orders', riderController.listRiderOrders);
router.get('/riders/:id', riderController.getRider);
router.put('/riders/:id', validate(updateRiderSchema), riderController.updateRider);
router.post('/orders/:id/assign', riderController.adminAssignRider);
router.post('/stores/place-riders', riderController.placeRidersNearAllStores);
router.post('/stores/:id/place-rider', riderController.placeRiderNearStore);

module.exports = router;