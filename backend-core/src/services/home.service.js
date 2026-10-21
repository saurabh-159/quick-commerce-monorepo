const Category = require('../models/Category');
const storeService = require('./store.service');
const catalogService = require('./catalog.service');

const TONES = ['#E8F6EC', '#FFF4D6', '#FDECEC', '#EAF2FF', '#F3EEFF', '#FFF0E6'];

const CATEGORY_ART = {
  'dairy-breakfast': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
  'fruits-vegetables': 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80',
  'snacks-munchies': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80'
};

const DEFAULT_ART = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

function categoryImage(category) {
  return category.imageUrl || (category.images && category.images[0]) || CATEGORY_ART[category.slug] || DEFAULT_ART;
}

function shapeProduct(product) {
  const mrpPaise = product.mrpPaise;
  const sellingPricePaise = product.sellingPricePaise;
  const discountPercent = mrpPaise > sellingPricePaise
    ? Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100)
    : 0;

  return {
    id: String(product.id),
    name: product.name,
    slug: product.slug,
    description: product.description || '',
    brand: product.brand || '',
    unit: product.unit,
    image: (product.images && product.images[0]) || '',
    category: product.category
      ? {
          id: String(product.category._id),
          name: product.category.name,
          slug: product.category.slug
        }
      : null,
    mrpPaise,
    sellingPricePaise,
    stock: product.stock,
    discountPercent
  };
}

function publicStore(store, distanceKm, etaMinutes) {
  return {
    id: String(store._id),
    name: store.name,
    addressText: store.addressText,
    description: store.description || '',
    image: (store.images && store.images[0]) || '',
    isOpen: store.isOpen,
    distanceKm,
    etaMinutes
  };
}

function emptyHome(lat, lng, message) {
  return {
    serviceable: false,
    message,
    hero: {
      title: 'Groceries in minutes',
      subtitle: 'We are not delivering here yet',
      searchPlaceholder: 'Search for milk, bread, snacks'
    },
    location: { lat, lng, label: 'Delivery location', address: 'Not serviceable' },
    store: null,
    banners: [],
    categories: [],
    sections: []
  };
}

const getHome = async ({ lat, lng, category, q }) => {
  const directory = await storeService.listStoreDirectory(lat, lng);
  let nearest;
  try {
    nearest = await storeService.findNearestStore(lat, lng);
  } catch (error) {
    return {
      ...emptyHome(lat, lng, error.message || 'Not serviceable at this location'),
      nearbyStores: directory.nearby,
      stores: directory.stores
    };
  }

  const store = nearest.store;
  const distanceKm = Number(nearest.distanceKm.toFixed(1));
  const etaMinutes = Math.min(25, Math.max(8, Math.round(distanceKm * 3 + 8)));
  const categories = await Category.find({ isActive: true }).sort({ name: 1 }).lean();

  const selected = category
    ? categories.find((item) => item.slug === category || String(item._id) === category)
    : null;

  const categoryCards = categories.map((item, index) => ({
    id: String(item._id),
    name: item.name,
    slug: item.slug,
    description: item.description || 'Everyday essentials',
    image: categoryImage(item),
    tone: TONES[index % TONES.length],
    href: `/?category=${item.slug}`
  }));

  let shaped = [];
  if (!category || selected) {
    const products = await catalogService.getProductsByStore(
      store._id,
      selected ? selected._id : '',
      q
    );
    shaped = products.map(shapeProduct);
  }

  const banners = categoryCards.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.name,
    subtitle: item.description,
    image: item.image,
    tone: item.tone,
    href: item.href
  }));

  let sections;
  if (q) {
    sections = [{
      id: 'search',
      title: `Results for "${q}"`,
      subtitle: `${shaped.length} items`,
      categorySlug: '',
      productCount: shaped.length,
      products: shaped.slice(0, 40)
    }];
  } else {
    const grouped = {};
    shaped.forEach((product) => {
      const slug = product.category?.slug || 'other';
      if (!grouped[slug]) grouped[slug] = [];
      grouped[slug].push(product);
    });

    sections = categoryCards
      .filter((item) => grouped[item.slug]?.length)
      .map((item) => {
        const list = grouped[item.slug];
        return {
          id: item.slug,
          title: item.name,
          subtitle: item.description,
          categorySlug: item.slug,
          productCount: list.length,
          products: list.slice(0, selected ? 40 : 8)
        };
      });
  }

  return {
    serviceable: true,
    message: category && !selected ? 'Category not found' : 'Home fetched successfully',
    hero: {
      title: 'Groceries in minutes',
      subtitle: store.isOpen ? `Delivery in ${etaMinutes} minutes` : 'Store is closed right now',
      searchPlaceholder: 'Search for milk, bread, snacks'
    },
    location: {
      lat,
      lng,
      label: 'Delivering to',
      address: store.addressText
    },
    store: publicStore(store, distanceKm, etaMinutes),
    banners,
    categories: categoryCards,
    sections,
    nearbyStores: directory.nearby,
    stores: directory.stores
  };
};

module.exports = { getHome };
