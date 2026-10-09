// Socket server entry point
// Placeholder — Socket.io setup will be added later.
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { port, clientOrigin } = require('./config');
const { pubClient, subClient } = require('./redis');
const setupSockets = require('./sockets/index');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Attach Redis adapter to Socket.io for multi-instance scaling
io.adapter(createAdapter(pubClient, subClient));

// Setup socket connection handlers
setupSockets(io);

// Subscribe to Redis channel `qc:events` broadcasted by backend-core
subClient.subscribe('qc:events', (err, count) => {
  if (err) {
    console.error('Failed to subscribe to redis channel:', err);
  } else {
    console.log(`Subscribed to qc:events. Active channels: ${count}`);
  }
});

subClient.on('message', (channel, message) => {
  if (channel === 'qc:events') {
    try {
      const event = JSON.parse(message);
      const { type, orderId, userId, riderId } = event;

      console.log(`📡 Received event from Redis:`, event);

      // Emit to order room
      if (orderId) {
        io.to(`order:${orderId}`).emit(type, event);
      }

      // Emit to user personal room
      if (userId) {
        io.to(`user:${userId}`).emit(type, event);
      }

      // Emit to rider room
      if (riderId) {
        io.to(`rider:${riderId}`).emit(type, event);
      }
    } catch (e) {
      console.error('Error parsing redis event message:', e);
    }
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'socket-service is running' });
});

server.listen(port, () => {
  console.log(`🚀 socket-service running on port ${port}`);
});