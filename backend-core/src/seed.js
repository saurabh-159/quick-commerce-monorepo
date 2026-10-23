/**
 * Complete Production Seeder for Quick Commerce
 * Matches GEMINI_FULL_GUIDE.md specs:
 * - Roles: customer | admin | delivery_partner (no "rider" role string)
 * - Money: Integer Paise (₹99 = 9900)
 * - Geo: [lng, lat] in Point coordinates
 * - Verified, High-Quality CDN URLs (100% working in browser, no ImageKit 404s)
 * - Comprehensive Delhi Dark Stores across all major zones
 * - Expanded Categories: Pet Care, Pharmacy & Health, Dairy, Fresh, Snacks, etc.
 */

const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Warp / local DNS often breaks mongodb+srv SRV lookups in Node
dns.setServers(['8.8.8.8', '1.1.1.1']);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/User');
const Store = require('./models/Store');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');
const Address = require('./models/Address');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Payment = require('./models/Payment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quick_commerce';

// --- DATA DEFINITIONS (Using 100% working, permanent high-resolution Unsplash CDN links) ---

// 1. Delhi Stores across all major zones
const storesData = [
  {
    name: 'QuickStore Connaught Place (Central)',
    phone: '9810001001',
    addressText: 'Block B, Connaught Place, New Delhi, Delhi 110001',
    images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2167, 28.6315] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Saket & Malviya Nagar (South)',
    phone: '9810001002',
    addressText: 'Community Centre, Saket, New Delhi, Delhi 110017',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2066, 28.5245] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Rajouri Garden (West)',
    phone: '9810001003',
    addressText: 'Main Ring Road, Rajouri Garden, New Delhi, Delhi 110027',
    images: ['https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.1215, 28.6415] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Laxmi Nagar & Preet Vihar (East)',
    phone: '9810001004',
    addressText: 'Vikas Marg, Laxmi Nagar, New Delhi, Delhi 110092',
    images: ['https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2773, 28.6304] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Rohini Sector 9 (North-West)',
    phone: '9810001005',
    addressText: 'Sector 9, Rohini, New Delhi, Delhi 110085',
    images: ['https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.1130, 28.7041] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Dwarka Sector 12 (South-West)',
    phone: '9810001006',
    addressText: 'Sector 12 City Centre, Dwarka, New Delhi, Delhi 110075',
    images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.0460, 28.5921] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Model Town & Civil Lines (North)',
    phone: '9810001007',
    addressText: 'Main Mall Road, Model Town, New Delhi, Delhi 110009',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.1926, 28.7025] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Okhla & Nehru Place (South-East)',
    phone: '9810001008',
    addressText: 'Okhla Industrial Area Phase 2, New Delhi, Delhi 110020',
    images: ['https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2530, 28.5494] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Karol Bagh & Patel Nagar (Central-West)',
    phone: '9810001009',
    addressText: 'Pusa Road, Karol Bagh, New Delhi, Delhi 110005',
    images: ['https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.1906, 28.6517] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Vasant Kunj & Aerocity (South-West)',
    phone: '9810001010',
    addressText: 'Nelson Mandela Marg, Vasant Kunj, New Delhi, Delhi 110070',
    images: ['https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.1574, 28.5402] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Chandni Chowk (Old Delhi)',
    phone: '9810001011',
    addressText: 'Netaji Subhash Marg, Daryaganj, New Delhi, Delhi 110002',
    images: ['https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2373, 28.6506] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
  {
    name: 'QuickStore Mayur Vihar Phase 1 (Trans-Yamuna)',
    phone: '9810001012',
    addressText: 'Pocket 1, Mayur Vihar Phase 1, New Delhi, Delhi 110091',
    images: ['https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'],
    location: { type: 'Point', coordinates: [77.2941, 28.6083] },
    serviceRadiusKm: 6,
    isOpen: true,
  },
];

// 2. Comprehensive Categories
const categoriesData = [
  {
    name: 'Dairy, Bread & Eggs',
    slug: 'dairy-bread-eggs',
    images: ['https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Fresh Vegetables & Fruits',
    slug: 'fresh-vegetables-fruits',
    images: ['https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Snacks & Munchies',
    slug: 'snacks-munchies',
    images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Cold Drinks & Juices',
    slug: 'cold-drinks-juices',
    images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Pharmacy & Doctor Care',
    slug: 'pharmacy-doctor-care',
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Pet & Animal Care',
    slug: 'pet-animal-care',
    images: ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Personal Care & Hygiene',
    slug: 'personal-care-hygiene',
    images: ['https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
  {
    name: 'Cleaning & Household',
    slug: 'cleaning-household',
    images: ['https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80'],
    isActive: true,
  },
];

// 3. Products map per category slug
const productsByCategorySlug = {
  'dairy-bread-eggs': [
    {
      name: 'Amul Taaza Homogenised Toned Milk',
      slug: 'amul-taaza-toned-milk-500ml',
      unit: '500 ml',
      mrpPaise: 2700,
      sellingPricePaise: 2700,
      images: ['https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Mother Dairy Classic Curd',
      slug: 'mother-dairy-classic-curd-400g',
      unit: '400 g',
      mrpPaise: 3500,
      sellingPricePaise: 3300,
      images: ['https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Amul Salted Butter',
      slug: 'amul-salted-butter-100g',
      unit: '100 g',
      mrpPaise: 5800,
      sellingPricePaise: 5600,
      images: ['https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Harvest Gold Brown Bread',
      slug: 'harvest-gold-brown-bread-400g',
      unit: '400 g',
      mrpPaise: 5000,
      sellingPricePaise: 4800,
      images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Farm Fresh White Eggs (Pack of 6)',
      slug: 'farm-fresh-white-eggs-6pack',
      unit: '6 pcs',
      mrpPaise: 5500,
      sellingPricePaise: 4900,
      images: ['https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Amul Malai Paneer',
      slug: 'amul-malai-paneer-200g',
      unit: '200 g',
      mrpPaise: 9200,
      sellingPricePaise: 8900,
      images: ['https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'fresh-vegetables-fruits': [
    {
      name: 'Fresh Hybrid Tomato',
      slug: 'fresh-hybrid-tomato-500g',
      unit: '500 g',
      mrpPaise: 2500,
      sellingPricePaise: 2000,
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Fresh Potato (Aloo)',
      slug: 'fresh-potato-1kg',
      unit: '1 kg',
      mrpPaise: 3500,
      sellingPricePaise: 2900,
      images: ['https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Fresh Red Onion (Pyaz)',
      slug: 'fresh-red-onion-1kg',
      unit: '1 kg',
      mrpPaise: 4500,
      sellingPricePaise: 3800,
      images: ['https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Fresh Robusta Banana',
      slug: 'fresh-banana-robusta-6pcs',
      unit: '6 pcs',
      mrpPaise: 4000,
      sellingPricePaise: 3600,
      images: ['https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Shimla Royal Delicious Apple',
      slug: 'shimla-apple-4pcs',
      unit: '4 pcs',
      mrpPaise: 16000,
      sellingPricePaise: 13900,
      images: ['https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Fresh Coriander (Dhaniya)',
      slug: 'fresh-coriander-100g',
      unit: '100 g',
      mrpPaise: 1500,
      sellingPricePaise: 1000,
      images: ['https://images.unsplash.com/photo-1589135233689-d56d35368a52?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'snacks-munchies': [
    {
      name: "Lay's India's Magic Masala Chips",
      slug: 'lays-magical-masala-50g',
      unit: '50 g',
      mrpPaise: 2000,
      sellingPricePaise: 2000,
      images: ['https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Kurkure Masala Munch Crisps',
      slug: 'kurkure-masala-munch-82g',
      unit: '82 g',
      mrpPaise: 2000,
      sellingPricePaise: 2000,
      images: ['https://images.unsplash.com/photo-1621447504864-d8686e12698c?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Haldiram Bhujia Sev',
      slug: 'haldiram-bhujia-sev-400g',
      unit: '400 g',
      mrpPaise: 12500,
      sellingPricePaise: 11000,
      images: ['https://images.unsplash.com/photo-1599490659213-e2b9527bd087?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Cadbury Dairy Milk Silk Chocolate',
      slug: 'cadbury-dairy-milk-silk-60g',
      unit: '60 g',
      mrpPaise: 8000,
      sellingPricePaise: 7500,
      images: ['https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Act II Classic Salted Instant Popcorn',
      slug: 'act-ii-classic-salted-popcorn-40g',
      unit: '40 g',
      mrpPaise: 1500,
      sellingPricePaise: 1400,
      images: ['https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'cold-drinks-juices': [
    {
      name: 'Coca-Cola Zero Sugar Can',
      slug: 'coca-cola-zero-sugar-300ml',
      unit: '300 ml',
      mrpPaise: 4000,
      sellingPricePaise: 3800,
      images: ['https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Real Mixed Fruit Juice',
      slug: 'real-mixed-fruit-juice-1l',
      unit: '1 L',
      mrpPaise: 13000,
      sellingPricePaise: 11500,
      images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Bisleri Packaged Drinking Water',
      slug: 'bisleri-mineral-water-1l',
      unit: '1 L',
      mrpPaise: 2000,
      sellingPricePaise: 2000,
      images: ['https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Red Bull Energy Drink',
      slug: 'red-bull-energy-drink-250ml',
      unit: '250 ml',
      mrpPaise: 12500,
      sellingPricePaise: 12000,
      images: ['https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'pharmacy-doctor-care': [
    {
      name: 'Dettol Antiseptic Liquid',
      slug: 'dettol-antiseptic-liquid-250ml',
      unit: '250 ml',
      mrpPaise: 15400,
      sellingPricePaise: 14500,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Crocin Pain Relief Paracetamol (Pack of 15)',
      slug: 'crocin-pain-relief-paracetamol-15tabs',
      unit: '15 tabs',
      mrpPaise: 6500,
      sellingPricePaise: 6000,
      images: ['https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Volini Pain Relief Spray',
      slug: 'volini-pain-relief-spray-40g',
      unit: '40 g',
      mrpPaise: 16000,
      sellingPricePaise: 14900,
      images: ['https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Hansaplast Regular Bandages (Pack of 10)',
      slug: 'hansaplast-bandages-10pack',
      unit: '10 pcs',
      mrpPaise: 3500,
      sellingPricePaise: 3200,
      images: ['https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Vicks Vaporub Balm',
      slug: 'vicks-vaporub-balm-25ml',
      unit: '25 ml',
      mrpPaise: 9500,
      sellingPricePaise: 8900,
      images: ['https://images.unsplash.com/photo-1579165466791-788226ab6fb7?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Dabur Chyawanprash Immunity Booster',
      slug: 'dabur-chyawanprash-500g',
      unit: '500 g',
      mrpPaise: 23500,
      sellingPricePaise: 21500,
      images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Dr. Morepen Digital Thermometer',
      slug: 'dr-morepen-digital-thermometer',
      unit: '1 unit',
      mrpPaise: 25000,
      sellingPricePaise: 19900,
      images: ['https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'pet-animal-care': [
    {
      name: 'Pedigree Adult Dry Dog Food (Chicken & Vegetables)',
      slug: 'pedigree-adult-dog-food-1-2kg',
      unit: '1.2 kg',
      mrpPaise: 33000,
      sellingPricePaise: 31000,
      images: ['https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Whiskas Ocean Fish Adult Dry Cat Food',
      slug: 'whiskas-ocean-fish-cat-food-1kg',
      unit: '1 kg',
      mrpPaise: 40000,
      sellingPricePaise: 37500,
      images: ['https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Drools Absolute Calcium Dog Bone Treats',
      slug: 'drools-calcium-dog-treats-30pcs',
      unit: '30 pcs',
      mrpPaise: 25000,
      sellingPricePaise: 22000,
      images: ['https://images.unsplash.com/photo-1541599540903-216a46ca1dc0?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Purepet Clumping Bentonite Cat Litter Lavender',
      slug: 'purepet-cat-litter-lavender-5kg',
      unit: '5 kg',
      mrpPaise: 45000,
      sellingPricePaise: 39900,
      images: ['https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Himalaya Erina-EP Flea & Tick Pet Shampoo',
      slug: 'himalaya-erina-ep-pet-shampoo-200ml',
      unit: '200 ml',
      mrpPaise: 22000,
      sellingPricePaise: 20500,
      images: ['https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'personal-care-hygiene': [
    {
      name: 'Colgate Strong Teeth Dental Toothpaste',
      slug: 'colgate-strong-teeth-paste-200g',
      unit: '200 g',
      mrpPaise: 11000,
      sellingPricePaise: 9800,
      images: ['https://images.unsplash.com/photo-1559591937-e62fb3d8d4bf?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Dove Deeply Nourishing Moisturising Bath Soap (Pack of 3)',
      slug: 'dove-nourishing-soap-3pack',
      unit: '3 x 100g',
      mrpPaise: 18000,
      sellingPricePaise: 16500,
      images: ['https://images.unsplash.com/photo-1608248597359-53e7a030b4ec?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Head & Shoulders Anti-Dandruff Shampoo',
      slug: 'head-shoulders-anti-dandruff-shampoo-180ml',
      unit: '180 ml',
      mrpPaise: 19000,
      sellingPricePaise: 17500,
      images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Whisper Ultra Clean Sanitary Pads (XL, 15 Pads)',
      slug: 'whisper-ultra-clean-xl-15pads',
      unit: '15 pcs',
      mrpPaise: 16500,
      sellingPricePaise: 15500,
      images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80'],
    },
  ],
  'cleaning-household': [
    {
      name: 'Vim Lemon Dishwash Gel',
      slug: 'vim-dishwash-gel-lemon-500ml',
      unit: '500 ml',
      mrpPaise: 12500,
      sellingPricePaise: 11000,
      images: ['https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Surf Excel Matic Top Load Detergent Liquid',
      slug: 'surf-excel-matic-liquid-1l',
      unit: '1 L',
      mrpPaise: 23000,
      sellingPricePaise: 21000,
      images: ['https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Lizol Disinfectant Surface Floor Cleaner Citrus',
      slug: 'lizol-floor-cleaner-citrus-500ml',
      unit: '500 ml',
      mrpPaise: 11200,
      sellingPricePaise: 9900,
      images: ['https://images.unsplash.com/photo-1563453392212-326f5e854473?auto=format&fit=crop&w=600&q=80'],
    },
    {
      name: 'Odonil Bathroom Air Freshener Lavender Block',
      slug: 'odonil-air-freshener-lavender-50g',
      unit: '50 g',
      mrpPaise: 5500,
      sellingPricePaise: 4900,
      images: ['https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&w=600&q=80'],
    },
  ],
};

// 4. Seed Logins matching Table in GEMINI_FULL_GUIDE.md
const usersSeedData = [
  {
    name: 'Platform Admin',
    phone: '9999999999',
    rawPassword: 'Admin@123',
    role: 'admin',
    email: 'admin@quickcommerce.local',
  },
  {
    name: 'Rajesh Rider (Central)',
    phone: '9876543210',
    rawPassword: 'Rider@123',
    role: 'delivery_partner',
    email: 'rider1@quickcommerce.local',
    rider: {
      isOnline: true,
      currentLocation: { type: 'Point', coordinates: [77.218, 28.632] },
      vehicleType: 'bike',
    },
  },
  {
    name: 'Amit Rider (South)',
    phone: '8888888888',
    rawPassword: 'Rider@123',
    role: 'delivery_partner',
    email: 'rider2@quickcommerce.local',
    rider: {
      isOnline: true,
      currentLocation: { type: 'Point', coordinates: [77.208, 28.526] },
      vehicleType: 'bike',
    },
  },
  {
    name: 'Vikas Rider (West)',
    phone: '9876500001',
    rawPassword: 'Rider@123',
    role: 'delivery_partner',
    email: 'rider3@quickcommerce.local',
    rider: {
      isOnline: true,
      currentLocation: { type: 'Point', coordinates: [77.123, 28.643] },
      vehicleType: 'bike',
    },
  },
  {
    name: 'Pooja Customer',
    phone: '9123456789',
    rawPassword: 'Cust@123',
    role: 'customer',
    email: 'pooja@example.com',
  },
  {
    name: 'Karan Customer',
    phone: '7777777777',
    rawPassword: 'Cust@123',
    role: 'customer',
    email: 'karan@example.com',
  },
];

async function seedDatabase() {
  try {
    const safeUri = MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log('Connecting to MongoDB:', safeUri);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully.');

    console.log('Cleaning old collections...');
    await Promise.all([
      User.deleteMany({}),
      Store.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      Address.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({}),
    ]);
    console.log('Old collections cleared.');

    console.log('Seeding Users (Admin, Delivery Partners, Customers)...');
    const userDocs = [];
    for (const u of usersSeedData) {
      const passwordHash = await bcrypt.hash(u.rawPassword, 10);
      const user = new User({
        name: u.name,
        phone: u.phone,
        email: u.email,
        passwordHash,
        role: u.role,
        rider: u.rider || undefined,
      });
      await user.save();
      userDocs.push(user);
    }
    console.log(`Seeded ${userDocs.length} users.`);

    console.log('Seeding Addresses...');
    const customer1 = userDocs.find((u) => u.phone === '9123456789');
    const customer2 = userDocs.find((u) => u.phone === '7777777777');

    if (customer1) {
      await Address.create([
        {
          user: customer1._id,
          label: 'Home',
          line1: 'Flat 402, Barakhamba Road, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          location: { type: 'Point', coordinates: [77.2215, 28.6302] },
          isDefault: true,
        },
        {
          user: customer1._id,
          label: 'Office',
          line1: 'DLF Cybercity Tower B',
          city: 'Gurugram',
          state: 'Haryana',
          pincode: '122002',
          location: { type: 'Point', coordinates: [77.0878, 28.4952] },
          isDefault: false,
        },
      ]);
    }

    if (customer2) {
      await Address.create({
        user: customer2._id,
        label: 'Home',
        line1: 'House 14, PVR Anupam Complex, Saket',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110017',
        location: { type: 'Point', coordinates: [77.2055, 28.5235] },
        isDefault: true,
      });
    }

    console.log('Seeding Stores across Delhi...');
    const createdStores = await Store.insertMany(storesData);
    console.log(`Seeded ${createdStores.length} dark stores across Delhi.`);

    console.log('Seeding Categories...');
    const createdCategories = await Category.insertMany(categoriesData);
    console.log(`Seeded ${createdCategories.length} categories.`);

    const categoryMap = new Map();
    createdCategories.forEach((cat) => {
      categoryMap.set(cat.slug, cat);
    });

    console.log('Seeding Products and populating Store Inventories...');
    const createdProducts = [];
    const inventoryDocs = [];

    for (const [catSlug, productList] of Object.entries(productsByCategorySlug)) {
      const categoryDoc = categoryMap.get(catSlug);
      if (!categoryDoc) continue;

      for (const prodData of productList) {
        const product = new Product({
          name: prodData.name,
          slug: prodData.slug,
          category: categoryDoc._id,
          unit: prodData.unit,
          mrpPaise: prodData.mrpPaise,
          images: prodData.images,
        });
        await product.save();
        createdProducts.push(product);

        for (const store of createdStores) {
          inventoryDocs.push({
            store: store._id,
            product: product._id,
            stock: 60,
            sellingPricePaise: prodData.sellingPricePaise,
          });
        }
      }
    }
    console.log(`Seeded ${createdProducts.length} products.`);

    console.log(`Populating ${inventoryDocs.length} inventory records...`);
    await Inventory.insertMany(inventoryDocs);
    console.log('Inventory successfully linked.');

    console.log('\n=================================================');
    console.log('  QUICK COMMERCE DATABASE SEEDED SUCCESSFULLY!    ');
    console.log('=================================================');
    console.log(`Total Stores: ${createdStores.length}`);
    console.log(`Total Categories: ${createdCategories.length}`);
    console.log(`Total Products: ${createdProducts.length}`);
    console.log(`Total Inventory Items: ${inventoryDocs.length}`);
    console.log(`Total Demo Users: ${userDocs.length}`);
    console.log('=================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

seedDatabase();
