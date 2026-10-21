const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, default: '' },
    highlights: [{ type: String }],
    unit: { type: String, required: true }, // e.g. "500g", "1L"
    images: [{ type: String }],
    mrpPaise: { type: Number, required: true }, // Money in paise
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
module.exports = Product;