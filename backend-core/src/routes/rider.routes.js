const express = require('express');
const router = express.Router();
const riderController = require('../controllers/rider.controller');
const { protect, allowRoles } = require('../middleware/auth');
const Joi = require('joi');
const validate = require('../middleware/validate');

const statusSchema = Joi.object({
  status: Joi.string().valid('accepted', 'packed', 'picked_up', 'on_the_way', 'delivered').required()
});

const onlineSchema = Joi.object({
  isOnline: Joi.boolean().required()
});

const locSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required()
});

router.use(protect, allowRoles('delivery_partner'));

router.patch('/online', validate(onlineSchema), riderController.setOnlineStatus);
router.patch('/location', validate(locSchema), riderController.updateLocation);
router.get('/assignments', riderController.getAssignments);
router.post('/orders/:id/status', validate(statusSchema), riderController.updateOrderStatus);

module.exports = router;