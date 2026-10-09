const express = require('express');
const router = express.Router();
const addressController = require('../controllers/address.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { addressSchema } = require('../validators/address.validator');

router.use(protect);

router.post('/', validate(addressSchema), addressController.addAddress);
router.get('/', addressController.getAddresses);
router.delete('/:id', addressController.removeAddress);

module.exports = router;