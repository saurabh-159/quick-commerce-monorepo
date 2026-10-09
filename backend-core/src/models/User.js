const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      length: 10
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['customer', 'delivery_partner', 'admin'],
      default: 'customer'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    rider: {
      isOnline: { type: Boolean, default: false },
      currentLocation: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] }
      },
      vehicleType: {
        type: String,
        enum: ['bike', 'cycle', 'ev'],
        default: 'bike'
      }
    }
  },
  { timestamps: true }
);

userSchema.index({ 'rider.currentLocation': '2dsphere' });

const User = mongoose.model('User', userSchema);
module.exports = User;