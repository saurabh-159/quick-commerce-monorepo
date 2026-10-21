const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressText: { type: String, required: true },
    description: { type: String, default: '' },
    images: [{ type: String }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    serviceRadiusKm: { type: Number, default: 5 },
    isOpen: { type: Boolean, default: true },
    openingMinutes: { type: Number, default: 0 },
    closingMinutes: { type: Number, default: 1440 }
  },
  { timestamps: true }
);

storeSchema.index({ location: '2dsphere' });

const Store = mongoose.model('Store', storeSchema);
module.exports = Store;