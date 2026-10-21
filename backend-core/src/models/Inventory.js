const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema(
  {
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    sellingPricePaise: { type: Number, required: true },
    stock: { type: Number, required: true, min: 0, default: 0 },
    description: { type: String, default: '' },
    images: [{ type: String }]
  },
  { timestamps: true }
);

inventorySchema.index({ store: 1, product: 1 }, { unique: true });

const Inventory = mongoose.model('Inventory', inventorySchema);
module.exports = Inventory;