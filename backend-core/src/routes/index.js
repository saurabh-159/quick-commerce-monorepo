const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const storeRoutes = require('./store.routes');
const catalogRoutes = require('./catalog.routes');
const adminRoutes = require('./admin.routes');
const addressRoutes = require('./address.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const riderRoutes = require('./rider.routes');

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ok',
    data: { service: 'backend-core', mongo: 'up' }
  });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/catalog', catalogRoutes);
router.use('/admin', adminRoutes);
router.use('/addresses', addressRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/rider', riderRoutes);

module.exports = router;