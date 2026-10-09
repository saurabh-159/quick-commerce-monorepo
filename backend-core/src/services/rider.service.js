const User = require('../models/User');
const Order = require('../models/Order');
const { haversineDistance } = require('../utils/geo');
const { publishEvent } = require('../utils/realtime.publisher');

const assignNearestRiderToOrder = async (orderId) => {
  const order = await Order.findById(orderId).populate('store');
  if (!order) return;

  const [storeLng, storeLat] = order.store.location.coordinates;

  const onlineRiders = await User.find({ role: 'delivery_partner', 'rider.isOnline': true });
  if (!onlineRiders || onlineRiders.length === 0) return;

  let nearestRider = null;
  let minDistance = Infinity;

  for (let i = 0; i < onlineRiders.length; i++) {
    const rider = onlineRiders[i];
    const riderLng = rider.rider.currentLocation.coordinates[0];
    const riderLat = rider.rider.currentLocation.coordinates[1];
    const distance = haversineDistance([storeLng, storeLat], [riderLng, riderLat]);

    if (distance <= 7 && distance < minDistance) {
      minDistance = distance;
      nearestRider = rider;
    }
  }

  if (nearestRider) {
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
  }
};

const updateRiderOnlineStatus = async (riderId, isOnline) => {
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

  return order;
};

module.exports = {
  assignNearestRiderToOrder,
  updateRiderOnlineStatus,
  updateRiderLocation,
  getRiderAssignments,
  updateRiderOrderStatus
};