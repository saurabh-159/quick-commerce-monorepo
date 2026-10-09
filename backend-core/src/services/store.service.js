const Store = require('../models/Store');
const { haversineDistance } = require('../utils/geo');

const findNearestStore = async (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  // Find stores within max possible radius or check all active stores using Haversine/MongoDB geospatial
  const stores = await Store.find({ isOpen: true });
  if (!stores || stores.length === 0) {
    throw new Error('No active stores available');
  }

  let nearestStore = null;
  let minDistance = Infinity;

  for (const store of stores) {
    const storeLng = store.location.coordinates[0];
    const storeLat = store.location.coordinates[1];
    const distance = haversineDistance([longitude, latitude], [storeLng, storeLat]);

    if (distance <= store.serviceRadiusKm && distance < minDistance) {
      minDistance = distance;
      nearestStore = store;
    }
  }

  if (!nearestStore) {
    throw new Error('Not serviceable at this location');
  }

  return { store: nearestStore, distanceKm: minDistance };
};

const createStore = async (storeData) => {
  return await Store.create(storeData);
};

const getAllStores = async () => {
  return await Store.find({});
};

module.exports = { findNearestStore, createStore, getAllStores };
