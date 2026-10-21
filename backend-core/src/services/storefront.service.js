const mongoose = require('mongoose');
const Category = require('../models/Category');
const Store = require('../models/Store');
const catalogService = require('./catalog.service');
const { haversineDistance } = require('../utils/geo');
const { toPublicStore } = require('./store.service');

const DEFAULT_ART = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

function categoryImage(category) {
  return category.imageUrl || (category.images && category.images[0]) || DEFAULT_ART;
}

function shapeProduct(product) {
  const mrpPaise = product.mrpPaise;
  const sellingPricePaise = product.sellingPricePaise;
  const discountPercent = mrpPaise > sellingPricePaise
    ? Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100)
    : 0;
  const category = product.category;

  return {
    id: String(product.id),
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    brand: product.brand || '',
    unit: product.unit,
    image: (product.images && product.images[0]) || '',
    images: product.images || [],
    highlights: product.highlights || [],
    category: category
      ? {
          id: String(category._id || category.id),
          name: category.name,
          slug: category.slug
        }
      : null,
    mrpPaise,
    sellingPricePaise,
    stock: product.stock,
    discountPercent
  };
}

async function storeCard(store, lat, lng) {
  const hasPoint = lat !== undefined && lng !== undefined && lat !== '' && lng !== '';
  if (!hasPoint) {
    const card = toPublicStore(store, store.serviceRadiusKm + 1);
    return { ...card, distanceKm: null, etaMinutes: null, inRange: false };
  }
  const distanceKm = haversineDistance(
    [parseFloat(lng), parseFloat(lat)],
    [store.location.coordinates[0], store.location.coordinates[1]]
  );
  return toPublicStore(store, distanceKm);
}

async function loadStore(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Store.findById(id);
}

const getStoreCatalog = async (id, { lat, lng, category }) => {
  const store = await loadStore(id);
  if (!store) return null;

  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
  const selected = category
    ? categories.find((item) => item.slug === category || String(item._id) === category)
    : null;

  const allProducts = (!category || selected)
    ? await catalogService.getProductsByStore(store._id)
    : [];
  const shapedAll = allProducts.map(shapeProduct);
  const shaped = selected
    ? shapedAll.filter((product) => product.category?.id === String(selected._id))
    : shapedAll;

  const counts = {};
  shapedAll.forEach((product) => {
    const slug = product.category?.slug;
    if (!slug) return;
    counts[slug] = (counts[slug] || 0) + 1;
  });

  const categoryCards = categories.map((item) => ({
    id: String(item._id),
    name: item.name,
    slug: item.slug,
    description: item.description || 'Everyday essentials',
    image: categoryImage(item),
    productCount: counts[item.slug] || 0,
    href: `/store/${store._id}?category=${item.slug}`
  }));

  const grouped = {};
  shaped.forEach((product) => {
    const slug = product.category?.slug || 'other';
    if (!grouped[slug]) grouped[slug] = [];
    grouped[slug].push(product);
  });

  const sections = categoryCards
    .filter((item) => grouped[item.slug]?.length)
    .map((item) => ({
      id: item.slug,
      title: item.name,
      subtitle: item.description,
      categorySlug: item.slug,
      productCount: grouped[item.slug].length,
      products: grouped[item.slug]
    }));

  return {
    store: await storeCard(store, lat, lng),
    categories: categoryCards.filter((item) => item.productCount > 0),
    sections,
    message: category && !selected ? 'Category not found' : 'Store fetched successfully'
  };
};

const getStoreProduct = async (storeId, productId, { lat, lng }) => {
  const store = await loadStore(storeId);
  if (!store || !mongoose.Types.ObjectId.isValid(productId)) return null;

  const products = await catalogService.getProductsByStore(store._id);
  const shaped = products.map(shapeProduct);
  const product = shaped.find((item) => item.id === String(productId));
  if (!product) return null;

  const related = shaped
    .filter((item) => item.id !== product.id && item.category?.slug === product.category?.slug)
    .slice(0, 4);

  return {
    store: await storeCard(store, lat, lng),
    product,
    related
  };
};

module.exports = { getStoreCatalog, getStoreProduct };
