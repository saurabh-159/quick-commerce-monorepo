const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Store = require('../models/Store');
const Inventory = require('../models/Inventory');
const { generateOrderNumber } = require('../utils/orderNumber');
const { haversineDistance } = require('../utils/geo');

const createOrderFromCart = async (userId, addressId, paymentMethod) => {
  const cart = await Cart.findOne({ user: userId }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }

  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new Error('Address not found');
  }

  const store = await Store.findById(cart.store);
  if (!store) {
    throw new Error('Store not found');
  }

  // Check if store services the address location
  const [storeLng, storeLat] = store.location.coordinates;
  const [addrLng, addrLat] = address.location.coordinates;
  const distance = haversineDistance([storeLng, storeLat], [addrLng, addrLat]);

  if (distance > store.serviceRadiusKm) {
    throw new Error('Address is outside store service radius');
  }

  // Verify stock and calculate totals
  let itemTotal = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const inventory = await Inventory.findOne({ store: cart.store, product: item.product._id });
    if (!inventory || inventory.stock < item.qty) {
      throw new Error(`Product ${item.product.name} is out of stock or lacks sufficient quantity`);
    }
    itemTotal += item.qty * item.pricePaiseSnapshot;
    orderItems.push({
      product: item.product._id,
      name: item.product.name,
      unit: item.product.unit,
      qty: item.qty,
      pricePaise: item.pricePaiseSnapshot
    });
  }

  // Delivery fee rule: 2900 paise if itemTotal < 19900 else 0
  const deliveryFee = itemTotal < 19900 ? 2900 : 0;
  const grandTotal = itemTotal + deliveryFee;

  // Decrement inventory stock atomically using $gte condition to avoid race conditions
  for (const item of cart.items) {
    const updateRes = await Inventory.findOneAndUpdate(
      { store: cart.store, product: item.product._id, stock: { $gte: item.qty } },
      { $inc: { stock: -item.qty } }
    );
    if (!updateRes) {
      throw new Error(`Stock update failed for product ${item.product.name}`);
    }
  }

  // Clear cart after successful order creation
  await Cart.deleteOne({ user: userId });

  const status = paymentMethod === 'cod' ? 'confirmed' : 'pending';

  const order = await Order.create({
    orderNumber: generateOrderNumber(),
    user: userId,
    store: cart.store,
    addressSnapshot: {
      line1: address.line1,
      city: address.city,
      pincode: address.pincode,
      location: address.location
    },
    items: orderItems,
    pricing: {
      itemTotal,
      deliveryFee,
      discount: 0,
      grandTotal
    },
    paymentMethod,
    paymentStatus: 'pending',
    status,
    statusHistory: [
      { status: 'pending', note: 'Order created' },
      ...(status === 'confirmed' ? [{ status: 'confirmed', note: 'COD order confirmed' }] : [])
    ],
    etaMinutes: 12
  });

  return order;
};

const getOrdersByUser = async (userId, role) => {
  if (role === 'admin') {
    return await Order.find({}).sort({ createdAt: -1 }).populate('user store rider');
  }
  return await Order.find({ user: userId }).sort({ createdAt: -1 }).populate('store rider');
};

const getOrderById = async (orderId, userId, role) => {
  const order = await Order.findById(orderId).populate('store rider items.product user');
  if (!order) throw new Error('Order not found');

  if (role === 'admin') return order;

  const ownerId = order.user?._id?.toString?.() || order.user?.toString?.();
  if (ownerId === userId.toString()) return order;

  const assignedRiderId = order.rider?._id?.toString?.() || order.rider?.toString?.();
  if (role === 'delivery_partner' && assignedRiderId === userId.toString()) {
    return order;
  }

  throw new Error('Access denied');
};

const cancelOrder = async (orderId, userId) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  if (order.user.toString() !== userId.toString()) {
    throw new Error('Access denied');
  }

  if (order.status !== 'pending' && order.status !== 'confirmed') {
    throw new Error('Order cannot be cancelled at this stage');
  }

  // Restore inventory stock back
  for (const item of order.items) {
    await Inventory.findOneAndUpdate(
      { store: order.store, product: item.product },
      { $inc: { stock: item.qty } }
    );
  }

  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();

  return order;
};

const updateOrderStatus = async (orderId, newStatus, riderId = null) => {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');

  order.status = newStatus;
  if (riderId) order.rider = riderId;
  order.statusHistory.push({ status: newStatus, note: `Status updated to ${newStatus}` });
  await order.save();
  return order;
};

module.exports = { createOrderFromCart, getOrdersByUser, getOrderById, cancelOrder, updateOrderStatus };