const mongoose = require('mongoose');
const { mongoUri } = require('./env');

const connectDB = async () => {
    try{
        await mongoose.connect(mongoUri)
        console.log('🔗 Connected to MongoDB');
    }catch(error){
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;