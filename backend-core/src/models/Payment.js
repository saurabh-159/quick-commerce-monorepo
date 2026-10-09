const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true },
    method: { type: String, enum: ['cod', 'online'], required: true },
    status: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    providerRef: { type: String, default: '' } // Mock transaction id
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;