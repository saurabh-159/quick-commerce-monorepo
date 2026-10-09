const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { assignNearestRiderToOrder } = require('./rider.service');

const mockOnlinePaymentSuccess = async (userId, orderId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  if (order.user.toString() !== userId.toString()) throw new Error('Access denied');

  if (order.paymentMethod !== 'online') {
    throw new Error('Order is not an online payment type');
  }

  if (order.paymentStatus === 'paid') {
    return order;
  }

  const payment = await Payment.create({
    order: order._id,
    user: userId,
    amountPaise: order.pricing.grandTotal,
    method: 'online',
    status: 'paid',
    providerRef: `MOCK_TXN_${Date.now()}`
  });

  order.paymentStatus = 'paid';
  order.status = 'confirmed';
  order.statusHistory.push({ status: 'confirmed', note: 'Online payment successful' });
  await order.save();

  await assignNearestRiderToOrder(order._id);

  return { order, payment };
};

module.exports = { mockOnlinePaymentSuccess };