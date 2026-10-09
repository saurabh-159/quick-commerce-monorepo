const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { nearbySchema } = require('../validators/store.validator');
const validate = require('../middleware/validate');

router.get('/nearby', validate(nearbySchema, 'query'), storeController.getNearbyStore);

module.exports = router;