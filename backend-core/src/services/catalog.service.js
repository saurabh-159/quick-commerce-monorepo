const Category = require('../models/Category');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

const getCategories = async () => {
  return await Category.find({ isActive: true });
};

const getProductsByStore = async (storeId, categoryId, q) => {
  const query = { isActive: true };
  if (categoryId) query.category = categoryId;
  if (q) query.name = { $regex: q, $options: 'i' };

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
        mrpPaise: p.mrpPaise,
        sellingPricePaise: inv.sellingPricePaise,
        stock: inv.stock
      };
    });

  return results;
};

const updateInventory = async (storeId, productId, stock, sellingPricePaise) => {
  const inventory = await Inventory.findOneAndUpdate(
    { store: storeId, product: productId },
    { stock, sellingPricePaise },
    { new: true, upsert: true }
  );
  return inventory;
};

const createCategory = async (data) => {
  return await Category.create(data);
};

const createProduct = async (data) => {
  return await Product.create(data);
};

module.exports = {
  getCategories,
  getProductsByStore,
  updateInventory,
  createCategory,
  createProduct
};