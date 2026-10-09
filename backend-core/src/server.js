const app = require('./app');
const { port } = require('./config/env');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

const startServer = async () => {
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`🚀 backend-core running on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down server gracefully...');
    server.close(async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();