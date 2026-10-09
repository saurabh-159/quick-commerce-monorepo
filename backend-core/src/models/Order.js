const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  unit: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  pricePaise: { type: Number, required: true }
});

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  at: { type: Date, default: Date.now },
  note: { type: String, default: '' }
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    addressSnapshot: {
      line1: { type: String, required: true },
      city: { type: String, required: true },
      pincode: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }
      }
    },
    items: [orderItemSchema],
    pricing: {
      itemTotal: { type: Number, required: true },
      deliveryFee: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      grandTotal: { type: Number, required: true }
    },
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'assigned', 'accepted', 'packed', 'picked_up', 'on_the_way', 'delivered', 'cancelled'],
      default: 'pending'
    },
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    statusHistory: [statusHistorySchema],
    etaMinutes: { type: Number, default: 12 }
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;