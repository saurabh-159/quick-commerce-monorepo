const net = require('net');
const os = require('os');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Category = require('./models/Category');
const Product = require('./models/Product');
const Store = require('./models/Store');
const Inventory = require('./models/Inventory');
const User = require('./models/User');
const Address = require('./models/Address');
const Cart = require('./models/Cart');
const Order = require('./models/Order');
const Payment = require('./models/Payment');

const canConnect = (host, port, timeoutMs = 500) => new Promise((resolve) => {
  const socket = net.connect({ host, port });
  const done = (ok) => {
    socket.destroy();
    resolve(ok);
  };
  socket.setTimeout(timeoutMs);
  socket.on('connect', () => done(true));
  socket.on('timeout', () => done(false));
  socket.on('error', () => done(false));
});

// docker-compose runs the API on mongodb://mongodb:27017/quick-commerce.
// On this machine 127.0.0.1:27017 is a separate Windows Mongo, so seeding
// localhost never shows up in the Docker API. Probe a non-loopback IPv4
// instead; that hits the published Docker port. Override with SEED_MONGO_URI.
const resolveMongoUri = async () => {
  if (process.env.SEED_MONGO_URI) return process.env.SEED_MONGO_URI;

  const fromEnv = process.env.MONGO_URI || '';
  if (fromEnv.includes('://mongodb:') || fromEnv.includes('@mongodb:')) return fromEnv;

  const ips = [];
  Object.values(os.networkInterfaces()).forEach((list) => {
    (list || []).forEach((entry) => {
      const v4 = entry.family === 'IPv4' || entry.family === 4;
      if (v4 && !entry.internal && !entry.address.startsWith('169.254.')) {
        ips.push(entry.address);
      }
    });
  });

  for (const ip of ips) {
    if (await canConnect(ip, 27017)) {
      return `mongodb://${ip}:27017/quick-commerce`;
    }
  }

  return 'mongodb://127.0.0.1:27017/quick-commerce';
};

const toPaise = (rupees) => Math.round(rupees * 100);

const seedData = async () => {
  try {
    const mongoUri = await resolveMongoUri();
    const safeUri = mongoUri.replace(/\/\/.*@/, '//');
    console.log(`Connecting to MongoDB for seeding (${safeUri})...`);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    await Promise.all([
      Product.deleteMany({}),
      Store.deleteMany({}),
      User.deleteMany({}),
      Category.deleteMany({}),
      Inventory.deleteMany({}),
      Address.deleteMany({}),
      Cart.deleteMany({}),
      Order.deleteMany({}),
      Payment.deleteMany({})
    ]);
    console.log('Existing catalog, users, carts, and orders cleared.');

    const stores = await Store.insertMany([
      {
        name: 'Connaught Place Dark Store',
        phone: '9810000001',
        addressText: 'Block A, Inner Circle, Connaught Place, New Delhi',
        location: {
          type: 'Point',
          coordinates: [77.209, 28.6139]
        },
        serviceRadiusKm: 5,
        isOpen: true
      },
      {
        name: 'Noida Sector 18 Hub',
        phone: '9810000002',
        addressText: 'Near Wave Mall, Sector 18, Noida, UP',
        location: {
          type: 'Point',
          coordinates: [77.3243, 28.5703]
        },
        serviceRadiusKm: 5,
        isOpen: true
      },
      {
        name: 'Paschim Vihar Pocket 3 Dark Store',
        phone: '9810000003',
        addressText: 'Pocket 3, Paschim Vihar, West Delhi, 110063',
        location: {
          type: 'Point',
          coordinates: [77.116261, 28.66606]
        },
        serviceRadiusKm: 5,
        isOpen: true
      },
      {
        name: 'Paschim Vihar B-Block Hub',
        phone: '9810000004',
        addressText: 'Road Number 77, B-Block, Paschim Vihar, West Delhi, 110027',
        location: {
          type: 'Point',
          coordinates: [77.123599, 28.660044]
        },
        serviceRadiusKm: 5,
        isOpen: true
      },
      {
        name: 'Janakpuri Dark Store',
        phone: '9810000005',
        addressText: 'Street Number 21, Janakpuri, West Delhi, 110018',
        location: {
          type: 'Point',
          coordinates: [77.085559, 28.632186]
        },
        serviceRadiusKm: 5,
        isOpen: true
      }
    ]);
    console.log(`Inserted ${stores.length} dark stores.`);

    const categories = await Category.insertMany([
      { name: 'Dairy & Breakfast', slug: 'dairy-breakfast', isActive: true },
      { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', isActive: true },
      { name: 'Snacks & Munchies', slug: 'snacks-munchies', isActive: true }
    ]);
    const categoryId = Object.fromEntries(categories.map((category) => [category.name, category._id]));
    console.log(`Inserted ${categories.length} categories.`);

    const catalog = [
      {
        name: 'Amul Taaza Toned Fresh Milk (500 ml)',
        slug: 'amul-taaza-toned-fresh-milk-500-ml',
        category: 'Dairy & Breakfast',
        brand: 'Amul',
        unit: '500 ml',
        price: 28,
        mrp: 30,
        stock: 150,
        image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b'
      },
      {
        name: 'Brown Bread - 100% Whole Wheat',
        slug: 'brown-bread-100-whole-wheat',
        category: 'Dairy & Breakfast',
        brand: 'Harvest',
        unit: '400 g',
        price: 45,
        mrp: 50,
        stock: 80,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff'
      },
      {
        name: 'Farm Fresh Organic Eggs (6 pcs)',
        slug: 'farm-fresh-organic-eggs-6-pcs',
        category: 'Dairy & Breakfast',
        brand: 'Farm Fresh',
        unit: '6 pack',
        price: 45,
        mrp: 55,
        stock: 100,
        image: 'https://images.unsplash.com/photo-1587486913049-53fc88980cfc'
      },
      {
        name: 'Fresh Bananas (1 kg)',
        slug: 'fresh-bananas-1-kg',
        category: 'Fruits & Vegetables',
        brand: 'Local',
        unit: '1 kg',
        price: 60,
        mrp: 75,
        stock: 60,
        image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e'
      },
      {
        name: "Lay's Magic Masala Chips",
        slug: 'lays-magic-masala-chips',
        category: 'Snacks & Munchies',
        brand: "Lay's",
        unit: '50 g',
        price: 20,
        mrp: 20,
        stock: 200,
        image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b'
      }
    ];

    const products = await Product.insertMany(
      catalog.map((item) => ({
        name: item.name,
        slug: item.slug,
        description: item.name,
        category: categoryId[item.category],
        brand: item.brand,
        unit: item.unit,
        images: [item.image],
        mrpPaise: toPaise(item.mrp),
        isActive: true
      }))
    );
    console.log(`Inserted ${products.length} products.`);

    const inventoryRows = [];
    stores.forEach((store) => {
      products.forEach((product, index) => {
        inventoryRows.push({
          store: store._id,
          product: product._id,
          sellingPricePaise: toPaise(catalog[index].price),
          stock: catalog[index].stock
        });
      });
    });
    await Inventory.insertMany(inventoryRows);
    console.log(`Inserted ${inventoryRows.length} inventory rows (all stores).`);

    const [adminPassword, riderPassword, custPassword] = await Promise.all([
      bcrypt.hash('Admin@123', 10),
      bcrypt.hash('Rider@123', 10),
      bcrypt.hash('Cust@123', 10)
    ]);

    const cpStore = stores[0];
    const noidaStore = stores[1];
    const paschimPocketStore = stores[2];
    const paschimBlockStore = stores[3];
    const janakpuriStore = stores[4];

    const users = await User.insertMany([
      {
        name: 'System Admin',
        phone: '9999999999',
        email: 'admin@quickcommerce.com',
        passwordHash: adminPassword,
        role: 'admin'
      },
      {
        name: 'Rahul Rider (CP Hub)',
        phone: '9876543210',
        email: 'rahul.rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: {
          isOnline: true,
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: cpStore.location.coordinates
          }
        }
      },
      {
        name: 'Test Rider',
        phone: '8888888888',
        email: 'rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: {
          isOnline: true,
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: noidaStore.location.coordinates
          }
        }
      },
      {
        name: 'Aman Rider (Paschim Vihar)',
        phone: '9876500003',
        email: 'aman.rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: {
          isOnline: true,
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: paschimPocketStore.location.coordinates
          }
        }
      },
      {
        name: 'Neha Rider (Paschim Vihar B-Block)',
        phone: '9876500004',
        email: 'neha.rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: {
          isOnline: true,
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: paschimBlockStore.location.coordinates
          }
        }
      },
      {
        name: 'Karan Rider (Janakpuri)',
        phone: '9876500005',
        email: 'karan.rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: {
          isOnline: true,
          vehicleType: 'bike',
          currentLocation: {
            type: 'Point',
            coordinates: janakpuriStore.location.coordinates
          }
        }
      },
      {
        name: 'Saurabh Customer',
        phone: '9123456789',
        email: 'saurabh@quickcommerce.com',
        passwordHash: custPassword,
        role: 'customer'
      },
      {
        name: 'Test Customer',
        phone: '7777777777',
        email: 'customer@quickcommerce.com',
        passwordHash: custPassword,
        role: 'customer'
      }
    ]);
    console.log(`Inserted ${users.length} users.`);

    const saurabh = users.find((user) => user.phone === '9123456789');
    const testCustomer = users.find((user) => user.phone === '7777777777');

    await Address.insertMany([
      {
        user: saurabh._id,
        label: 'Home',
        line1: 'Block B, Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        location: {
          type: 'Point',
          coordinates: [77.215, 28.62]
        },
        isDefault: true
      },
      {
        user: testCustomer._id,
        label: 'Home',
        line1: 'Block A, Connaught Place, New Delhi',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
        location: {
          type: 'Point',
          coordinates: [77.209, 28.6139]
        },
        isDefault: true
      }
    ]);
    console.log('Inserted customer addresses inside the CP store radius.');

    console.log('Database seeding completed.');
    console.log('Logins: admin 9999999999 / Admin@123 | Rahul 9876543210 / Rider@123 | rider 8888888888 / Rider@123 | Aman 9876500003 / Rider@123 | Neha 9876500004 / Rider@123 | Karan 9876500005 / Rider@123 | Saurabh 9123456789 / Cust@123 | customer 7777777777 / Cust@123');
    process.exit(0);
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  }
};

seedData();
