const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Order = require('../models/Order');
const Store = require('../models/Store');
const { haversineDistance } = require('../utils/geo');
const { publishEvent } = require('../utils/realtime.publisher');

const ACTIVE_ORDER_STATUSES = ['assigned', 'accepted', 'packed', 'picked_up', 'on_the_way'];
const riderMovementTimers = new Map();

const stopRiderMovement = (orderId) => {
  const key = String(orderId);
  const timer = riderMovementTimers.get(key);
  if (!timer) return;
  clearInterval(timer);
  riderMovementTimers.delete(key);
};

const pointBetween = (from, to, progress) => ({
  lng: from[0] + (to[0] - from[0]) * progress,
  lat: from[1] + (to[1] - from[1]) * progress
});

const startRiderMovement = async (orderId) => {
  stopRiderMovement(orderId);

  const order = await Order.findById(orderId).populate('store');
  const storePoint = order?.store?.location?.coordinates;
  const homePoint = order?.addressSnapshot?.location?.coordinates;
  if (!order?.rider || !storePoint || !homePoint) return;

  let step = 0;
  const steps = 10;

  const timer = setInterval(async () => {
    step += 1;
    if (step > steps) {
      stopRiderMovement(orderId);
      return;
    }

    try {
      const fresh = await Order.findById(orderId).select('status rider user');
      if (!fresh || fresh.status !== 'on_the_way') {
        stopRiderMovement(orderId);
        return;
      }

      const { lat, lng } = pointBetween(storePoint, homePoint, step / steps);
      const distanceKm = Number(haversineDistance([lng, lat], homePoint).toFixed(1));

      await User.findByIdAndUpdate(fresh.rider, {
        'rider.currentLocation': {
          type: 'Point',
          coordinates: [lng, lat]
        }
      });

      await publishEvent({
        type: 'rider:location',
        orderId: fresh._id,
        userId: fresh.user,
        riderId: fresh.rider,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        distanceKm,
        status: 'on_the_way'
      });
    } catch (error) {
      console.error('Rider movement update failed:', error.message);
    }
  }, 3000);

  riderMovementTimers.set(String(orderId), timer);
};

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toRider = (user, counts = {}) => ({
  _id: user._id,
  name: user.name,
  phone: user.phone,
  email: user.email || '',
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
  rider: {
    isOnline: Boolean(user.rider?.isOnline),
    vehicleType: user.rider?.vehicleType || 'bike',
    currentLocation: user.rider?.currentLocation || { type: 'Point', coordinates: [0, 0] }
  },
  activeOrders: counts.activeOrders || 0,
  deliveredOrders: counts.deliveredOrders || 0
});

const assignNearestRiderToOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate('store');
  if (!order) return;

  const [storeLng, storeLat] = order.store.location.coordinates;

  const onlineRiders = await User.find({
    role: 'delivery_partner',
    isActive: { $ne: false },
    'rider.isOnline': true
  });
  // No online partners: leave order as confirmed for admin manual assign
  if (!onlineRiders || onlineRiders.length === 0) return;

  let nearestInRadius = null;
  let minInRadius = Infinity;
  let nearestAny = null;
  let minAny = Infinity;

  for (let i = 0; i < onlineRiders.length; i++) {
    const rider = onlineRiders[i];
    const coords = rider.rider?.currentLocation?.coordinates;
    if (!coords) continue;

    const distance = haversineDistance([storeLng, storeLat], [coords[0], coords[1]]);

    if (distance < minAny) {
      minAny = distance;
      nearestAny = rider;
    }

    if (distance <= 7 && distance < minInRadius) {
      minInRadius = distance;
      nearestInRadius = rider;
    }
  }

  // Prefer within 7 km; else nearest online partner (no hard maxDistance / no throw)
  const nearestRider = nearestInRadius || nearestAny;
  if (!nearestRider) return;

  order.rider = nearestRider._id;
  order.status = 'assigned';
  order.statusHistory.push({ status: 'assigned', note: `Assigned to rider ${nearestRider.name}` });
  await order.save();

  await publishEvent({
    type: 'order:assigned',
    orderId: order._id,
    userId: order.user,
    riderId: nearestRider._id,
    status: 'assigned'
  });
};

const updateRiderOnlineStatus = async (riderId, isOnline) => {
  const rider = await User.findById(riderId).select('isActive');
  if (!rider) throw fail('Rider not found', 404);
  if (rider.isActive === false && isOnline) throw fail('This rider account is inactive', 403);

  return await User.findByIdAndUpdate(
    riderId,
    { 'rider.isOnline': isOnline },
    { new: true }
  );
};

const updateRiderLocation = async (riderId, lat, lng) => {
  return await User.findByIdAndUpdate(
    riderId,
    {
      'rider.currentLocation': {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      }
    },
    { new: true }
  );
};

const getRiderAssignments = async (riderId) => {
  return await Order.find({
    rider: riderId,
    status: { $in: ['assigned', 'accepted', 'packed', 'picked_up', 'on_the_way'] }
  }).sort({ createdAt: -1 });
};

const updateRiderOrderStatus = async (orderId, riderId, newStatus) => {
  const allowedTransitions = {
    assigned: ['accepted'],
    accepted: ['packed'],
    packed: ['picked_up'],
    picked_up: ['on_the_way'],
    on_the_way: ['delivered']
  };

  const order = await Order.findById(orderId);
  if (!order) throw new Error('Order not found');
  if (order.rider.toString() !== riderId.toString()) throw new Error('Unauthorized for this order');

  const validNextStates = allowedTransitions[order.status] || [];
  if (!validNextStates.includes(newStatus)) {
    throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
  }

  order.status = newStatus;
  order.statusHistory.push({ status: newStatus, note: `Rider updated status to ${newStatus}` });
  await order.save();

  await publishEvent({
    type: 'order:status',
    orderId: order._id,
    userId: order.user,
    riderId: order.rider,
    status: newStatus
  });

  if (newStatus === 'on_the_way') {
    startRiderMovement(order._id);
  } else {
    stopRiderMovement(order._id);
  }

  return order;
};

const findDeliveryPartner = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findOne({ _id: id, role: 'delivery_partner' });
};

const orderCountsByRider = async (riderIds) => {
  if (!riderIds.length) return {};
  const rows = await Order.aggregate([
    { $match: { rider: { $in: riderIds } } },
    {
      $group: {
        _id: '$rider',
        activeOrders: {
          $sum: { $cond: [{ $in: ['$status', ACTIVE_ORDER_STATUSES] }, 1, 0] }
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
        }
      }
    }
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row]));
};

const assertContactAvailable = async ({ phone, email, excludeId }) => {
  const phoneQuery = { phone };
  if (excludeId) phoneQuery._id = { $ne: excludeId };
  if (await User.exists(phoneQuery)) {
    throw fail('A user with this phone number already exists');
  }

  if (!email) return;
  const emailQuery = { email };
  if (excludeId) emailQuery._id = { $ne: excludeId };
  if (await User.exists(emailQuery)) {
    throw fail('A user with this email already exists');
  }
};

const listAdminRiders = async () => {
  const riders = await User.find({ role: 'delivery_partner' }).sort({ name: 1 });
  const counts = await orderCountsByRider(riders.map((rider) => rider._id));
  return riders.map((rider) => toRider(rider, counts[String(rider._id)]));
};

const getAdminRider = async (id) => {
  const rider = await findDeliveryPartner(id);
  if (!rider) return null;
  const counts = await orderCountsByRider([rider._id]);
  return toRider(rider, counts[String(rider._id)]);
};

const createAdminRider = async ({ name, phone, email, password, vehicleType }) => {
  const normalizedEmail = email || '';
  await assertContactAvailable({ phone, email: normalizedEmail });

  const passwordHash = await bcrypt.hash(password, 10);
  const rider = await User.create({
    name,
    phone,
    ...(normalizedEmail ? { email: normalizedEmail } : {}),
    passwordHash,
    role: 'delivery_partner',
    isActive: true,
    rider: {
      isOnline: false,
      vehicleType,
      currentLocation: { type: 'Point', coordinates: [0, 0] }
    }
  });

  return toRider(rider);
};

const updateAdminRider = async (id, payload) => {
  const rider = await findDeliveryPartner(id);
  if (!rider) return null;

  const normalizedEmail = payload.email || '';
  await assertContactAvailable({ phone: payload.phone, email: normalizedEmail, excludeId: rider._id });

  const isOnline = payload.isActive
    ? (typeof payload.isOnline === 'boolean' ? payload.isOnline : Boolean(rider.rider?.isOnline))
    : false;

  rider.name = payload.name;
  rider.phone = payload.phone;
  rider.isActive = payload.isActive;
  rider.rider = rider.rider || {};
  rider.rider.vehicleType = payload.vehicleType;
  rider.rider.isOnline = isOnline;
  if (normalizedEmail) rider.email = normalizedEmail;
  else rider.set('email', undefined);
  if (payload.password) rider.passwordHash = await bcrypt.hash(payload.password, 10);
  rider.markModified('rider');

  try {
    await rider.save();
  } catch (error) {
    if (error?.code !== 11000) throw error;
    throw fail(error.keyPattern?.email
      ? 'A user with this email already exists'
      : 'A user with this phone number already exists');
  }
  const counts = await orderCountsByRider([rider._id]);
  return toRider(rider, counts[String(rider._id)]);
};

const listAdminRiderOrders = async (id) => {
  const rider = await findDeliveryPartner(id);
  if (!rider) return null;

  return Order.find({ rider: rider._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('orderNumber status paymentMethod paymentStatus pricing.grandTotal createdAt user store')
    .populate('user', 'name phone')
    .populate('store', 'name');
};

const nearestRiderToStore = (store, riders) => {
  const storeCoords = store?.location?.coordinates;
  if (!storeCoords) return null;

  let nearest = null;
  riders.forEach((rider) => {
    const coords = rider?.rider?.currentLocation?.coordinates;
    if (!coords || (coords[0] === 0 && coords[1] === 0)) return;
    const distanceKm = haversineDistance(storeCoords, coords);
    if (!nearest || distanceKm < nearest.distanceKm) {
      nearest = { rider, distanceKm };
    }
  });
  return nearest;
};

const placeRiderNearStore = async (storeId) => {
  if (!mongoose.Types.ObjectId.isValid(storeId)) throw fail('Select a valid shop');
  const store = await Store.findById(storeId);
  if (!store) throw fail('Shop not found', 404);

  const riders = await User.find({ role: 'delivery_partner', isActive: { $ne: false } });
  const nearest = nearestRiderToStore(store, riders);
  if (nearest && nearest.distanceKm <= 1) {
    return {
      created: false,
      storeName: store.name,
      riderName: nearest.rider.name,
      distanceKm: Number(nearest.distanceKm.toFixed(1))
    };
  }

  const phoneBase = 9811100000 + (await User.countDocuments({ role: 'delivery_partner' }));
  let phone = String(phoneBase);
  while (await User.exists({ phone })) {
    phone = String(Number(phone) + 1);
  }

  const slug = String(store.name || 'shop')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const rider = await User.create({
    name: `${store.name} Rider`,
    phone,
    email: `${slug}.rider@quickcommerce.com`,
    passwordHash: await bcrypt.hash('Rider@123', 10),
    role: 'delivery_partner',
    isActive: true,
    rider: {
      isOnline: true,
      vehicleType: 'bike',
      currentLocation: {
        type: 'Point',
        coordinates: store.location.coordinates
      }
    }
  });

  return {
    created: true,
    storeName: store.name,
    riderName: rider.name,
    phone: rider.phone,
    distanceKm: 0
  };
};

const placeRidersNearAllStores = async () => {
  const stores = await Store.find({});
  const placed = [];
  for (const store of stores) {
    placed.push(await placeRiderNearStore(store._id));
  }
  return placed;
};

const assignRiderToOrder = async (orderId, riderId) => {
  if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(riderId)) {
    throw fail('Select a valid order and rider');
  }

  const [order, rider] = await Promise.all([
    Order.findById(orderId),
    findDeliveryPartner(riderId)
  ]);

  if (!order) throw fail('Order not found', 404);
  if (!rider) throw fail('Rider not found', 404);
  if (rider.isActive === false) throw fail('This rider account is inactive');
  if (order.status === 'delivered' || order.status === 'cancelled') {
    throw fail('This order can no longer be assigned');
  }

  order.rider = rider._id;
  order.status = 'assigned';
  order.statusHistory.push({ status: 'assigned', note: 'Manually assigned by admin' });
  await order.save();

  await publishEvent({
    type: 'order:assigned',
    orderId: order._id,
    userId: order.user,
    riderId: rider._id,
    status: 'assigned'
  });

  return order;
};

module.exports = {
  assignNearestRiderToOrder,
  updateRiderOnlineStatus,
  updateRiderLocation,
  getRiderAssignments,
  updateRiderOrderStatus,
  listAdminRiders,
  getAdminRider,
  createAdminRider,
  updateAdminRider,
  listAdminRiderOrders,
  assignRiderToOrder,
  placeRiderNearStore,
  placeRidersNearAllStores
};