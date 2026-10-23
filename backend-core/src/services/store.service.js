const mongoose = require('mongoose');
const Store = require('../models/Store');
const Inventory = require('../models/Inventory');
const Cart = require('../models/Cart');
const { cleanUrls } = require('../utils/cleanUrls');
const { haversineDistance } = require('../utils/geo');

const STORE_IMAGE = 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80';

function toPublicStore(store, distanceKm) {
  const latitude = store.location.coordinates[1];
  const longitude = store.location.coordinates[0];
  const radius = store.serviceRadiusKm || 5;
  const inRange = Boolean(store.isOpen) && distanceKm <= radius;
  return {
    id: String(store._id),
    name: store.name,
    addressText: store.addressText,
    description: store.description || '',
    image: (store.images && store.images[0]) || STORE_IMAGE,
    isOpen: Boolean(store.isOpen),
    lat: latitude,
    lng: longitude,
    distanceKm: Number(distanceKm.toFixed(1)),
    etaMinutes: Math.max(10, Math.round(10 + distanceKm * 3)),
    inRange,
    serviceRadiusKm: radius
  };
}

const listStoreDirectory = async (lat, lng) => {
  const stores = await Store.find({});
  const cards = stores.map((store) => {
    const distance = haversineDistance(
      [parseFloat(lng), parseFloat(lat)],
      [store.location.coordinates[0], store.location.coordinates[1]]
    );
    return toPublicStore(store, distance);
  });
  cards.sort((a, b) => a.distanceKm - b.distanceKm);

  const inRadius = cards.filter((store) => store.inRange);
  // Prefer in-radius stores; if none, fall back to nearest open stores (no empty screen)
  const nearby = inRadius.length ? inRadius : cards.filter((store) => store.isOpen);

  return {
    nearby,
    stores: cards
  };
};

const findNearestStore = async (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  const stores = await Store.find({ isOpen: true });
  if (!stores || stores.length === 0) {
    throw new Error('No active stores available');
  }

  let nearestInRadius = null;
  let minInRadius = Infinity;
  let nearestAny = null;
  let minAny = Infinity;

  for (const store of stores) {
    const storeLng = store.location.coordinates[0];
    const storeLat = store.location.coordinates[1];
    const distance = haversineDistance([longitude, latitude], [storeLng, storeLat]);
    const radius = store.serviceRadiusKm || 5;

    if (distance < minAny) {
      minAny = distance;
      nearestAny = store;
    }

    if (distance <= radius && distance < minInRadius) {
      minInRadius = distance;
      nearestInRadius = store;
    }
  }

  // Prefer service radius; fall back to nearest open store so location is never "unserviceable"
  if (nearestInRadius) {
    return { store: nearestInRadius, distanceKm: minInRadius };
  }

  return { store: nearestAny, distanceKm: minAny };
};

const createStore = async (storeData) => {
  const next = { ...storeData };
  if (next.description !== undefined) next.description = String(next.description || '');
  if (next.images !== undefined) next.images = cleanUrls(next.images);
  return await Store.create(next);
};

const getAllStores = async () => {
  return await Store.find({}).sort({ createdAt: -1 });
};

const getStoreById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Store.findById(id);
};

const updateStore = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const allowed = {};
  if (data.images !== undefined) data.images = cleanUrls(data.images);
  if (data.description !== undefined) data.description = String(data.description || '');
  ['name', 'phone', 'addressText', 'location', 'serviceRadiusKm', 'isOpen', 'description', 'images'].forEach((key) => {
    if (data[key] !== undefined) allowed[key] = data[key];
  });
  return Store.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
};

const deleteStore = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const store = await Store.findByIdAndDelete(id);
  if (!store) return null;
  await Inventory.deleteMany({ store: id });
  await Cart.deleteMany({ store: id });
  return store;
};

module.exports = {
  listStoreDirectory,
  toPublicStore,
  findNearestStore,
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore
};
