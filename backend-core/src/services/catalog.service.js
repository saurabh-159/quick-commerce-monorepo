const mongoose = require('mongoose');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Cart = require('../models/Cart');
const { cleanUrls, cleanLines } = require('../utils/cleanUrls');

const getCategories = async () => {
  return await Category.find({ isActive: true });
};

const getProductsByStore = async (storeId, categoryId, q) => {
  const query = { isActive: true };
  if (categoryId) query.category = categoryId;
  if (q) {
    const safe = String(q).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.name = { $regex: safe, $options: 'i' };
  }

  const products = await Product.find(query).populate('category', 'name slug');

  // Fetch inventory for these products in the given store
  const productIds = products.map((p) => p._id);
  const inventories = await Inventory.find({ store: storeId, product: { $in: productIds } });

  const inventoryMap = {};
  inventories.forEach((inv) => {
    inventoryMap[inv.product.toString()] = {
      sellingPricePaise: inv.sellingPricePaise,
      stock: inv.stock
    };
  });

  // Combine product details with store inventory
  const results = products
    .filter((p) => inventoryMap[p._id.toString()]) // only show products that have inventory in this store
    .map((p) => {
      const inv = inventoryMap[p._id.toString()];
      return {
        id: p._id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        images: p.images,
        highlights: p.highlights || [],
        mrpPaise: p.mrpPaise,
        sellingPricePaise: inv.sellingPricePaise,
        stock: inv.stock
      };
    });

  return results;
};

const updateInventory = async (storeId, productId, stock, sellingPricePaise, extras = {}) => {
  const update = { stock, sellingPricePaise };
  if (extras.description !== undefined) update.description = String(extras.description || '');
  if (extras.images !== undefined) update.images = cleanUrls(extras.images);
  const inventory = await Inventory.findOneAndUpdate(
    { store: storeId, product: productId },
    update,
    { new: true, upsert: true }
  );
  return inventory;
};

function withCategoryMedia(data) {
  const next = { ...data };
  if (next.description !== undefined) next.description = String(next.description || '');
  if (next.images !== undefined) {
    next.images = cleanUrls(next.images);
    next.imageUrl = next.images[0] || '';
  }
  return next;
}

const createCategory = async (data) => {
  return await Category.create(withCategoryMedia(data));
};

const listAllCategories = async () => {
  return Category.find().sort({ name: 1 });
};

const getCategoryById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Category.findById(id);
};

const updateCategory = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const next = withCategoryMedia(data);
  const allowed = {};
  ['name', 'slug', 'isActive', 'description', 'images', 'imageUrl'].forEach((key) => {
    if (next[key] !== undefined) allowed[key] = next[key];
  });
  return Category.findByIdAndUpdate(id, allowed, { new: true, runValidators: true });
};

const deleteCategory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return { status: 'missing' };
  const used = await Product.countDocuments({ category: id });
  if (used > 0) return { status: 'in_use', used };
  const category = await Category.findByIdAndDelete(id);
  if (!category) return { status: 'missing' };
  return { status: 'deleted', category };
};

const listInventory = async () => {
  const rows = await Inventory.find()
    .populate('store', 'name addressText')
    .populate({
      path: 'product',
      select: 'name unit category',
      populate: { path: 'category', select: 'name' }
    });

  const stores = {};

  for (const row of rows) {
    if (!row.store || !row.product) continue;

    const storeId = String(row.store._id);
    if (!stores[storeId]) {
      stores[storeId] = {
        store: {
          _id: row.store._id,
          name: row.store.name,
          addressText: row.store.addressText
        },
        products: []
      };
    }

    stores[storeId].products.push({
      _id: row._id,
      productId: row.product._id,
      name: row.product.name,
      unit: row.product.unit || '',
      category: row.product.category?.name || 'Uncategorized',
      stock: row.stock,
      sellingPricePaise: row.sellingPricePaise,
      description: row.description || '',
      images: row.images || []
    });
  }

  const result = [];
  for (const storeId of Object.keys(stores)) {
    const group = stores[storeId];
    const categories = [];
    for (const product of group.products) {
      if (!categories.includes(product.category)) categories.push(product.category);
    }
    group.products.sort((a, b) => a.name.localeCompare(b.name));
    result.push({
      store: group.store,
      productCount: group.products.length,
      categories,
      products: group.products
    });
  }

  result.sort((a, b) => a.store.name.localeCompare(b.store.name));
  return result;
};

const getInventoryById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Inventory.findById(id).populate('store', 'name addressText').populate('product', 'name unit');
};

const updateInventoryById = async (id, stock, sellingPricePaise) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Inventory.findByIdAndUpdate(id, { stock, sellingPricePaise }, { new: true, runValidators: true })
    .populate('store', 'name addressText')
    .populate('product', 'name unit');
};

const deleteInventory = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Inventory.findByIdAndDelete(id);
};

function withProductMedia(data) {
  const next = { ...data };
  if (next.description !== undefined) next.description = String(next.description || '');
  if (next.brand !== undefined) next.brand = String(next.brand || '');
  if (next.images !== undefined) next.images = cleanUrls(next.images);
  if (next.highlights !== undefined) next.highlights = cleanLines(next.highlights);
  return next;
}

const createProduct = async (data) => {
  return await Product.create(withProductMedia(data));
};

const listAllProducts = async () => {
  return await Product.find().populate('category', 'name slug').sort({ createdAt: -1 });
};

const getProductById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Product.findById(id).populate('category', 'name slug');
};

const updateProduct = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const next = withProductMedia(data);
  const allowed = {};
  ['name', 'slug', 'category', 'unit', 'mrpPaise', 'description', 'brand', 'images', 'highlights'].forEach((key) => {
    if (next[key] !== undefined) allowed[key] = next[key];
  });
  return Product.findByIdAndUpdate(id, allowed, { new: true, runValidators: true }).populate(
    'category',
    'name slug'
  );
};

const deleteProduct = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  const product = await Product.findByIdAndDelete(id);
  if (!product) return null;
  await Inventory.deleteMany({ product: id });
  await Cart.updateMany({ 'items.product': id }, { $pull: { items: { product: id } } });
  return product;
};

module.exports = {
  getCategories,
  getProductsByStore,
  updateInventory,
  createCategory,
  listAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  createProduct,
  listAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  listInventory,
  getInventoryById,
  updateInventoryById,
  deleteInventory
};