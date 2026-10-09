const Address = require('../models/Address');

const createAddress = async (userId, data) => {
  const { lat, lng, ...rest } = data;
  if (rest.isDefault) {
    await Address.updateMany({ user: userId }, { isDefault: false });
  }
  const address = await Address.create({
    ...rest,
    user: userId,
    location: { type: 'Point', coordinates: [lng, lat] }
  });
  return address;
};

const getUserAddresses = async (userId) => {
  return await Address.find({ user: userId });
};

const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOneAndDelete({ _id: addressId, user: userId });
  if (!address) throw new Error('Address not found');
  return address;
};

module.exports = { createAddress, getUserAddresses, deleteAddress };