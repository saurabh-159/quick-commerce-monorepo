const mongoose = require('mongoose');
const { mongoUri } = require('./config/env');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const seedDatabase = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB for seeding...');

    // Clear existing users (optional for dev)
    await User.deleteMany({});

    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@123', salt);
    const riderPassword = await bcrypt.hash('Rider@123', salt);
    const custPassword = await bcrypt.hash('Cust@123', salt);

    await User.create([
      {
        name: 'System Admin',
        phone: '9999999999',
        email: 'admin@quickcommerce.com',
        passwordHash: adminPassword,
        role: 'admin'
      },
      {
        name: 'Test Rider',
        phone: '8888888888',
        email: 'rider@quickcommerce.com',
        passwordHash: riderPassword,
        role: 'delivery_partner',
        rider: { isOnline: true }
      },
      {
        name: 'Test Customer',
        phone: '7777777777',
        email: 'customer@quickcommerce.com',
        passwordHash: custPassword,
        role: 'customer'
      }
    ]);

    console.log('🌱 Database seeded successfully with Admin, Rider, and Customer!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();