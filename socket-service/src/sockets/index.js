const jwt = require('jsonwebtoken');
const { jwtAccessSecret } = require('../config');

const setupSockets = (io) => {
  // Middleware for authentication during socket handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, jwtAccessSecret);
      socket.user = decoded; // { sub: userId, role }
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id} (User: ${socket.user.sub})`);

    // Automatically join user to their personal room
    const userRoom = `user:${socket.user.sub}`;
    socket.join(userRoom);
    console.log(`User joined room: ${userRoom}`);

    // If user is a rider, join rider room
    if (socket.user.role === 'delivery_partner') {
      const riderRoom = `rider:${socket.user.sub}`;
      socket.join(riderRoom);
      console.log(`Rider joined room: ${riderRoom}`);
    }

    // Client can join a specific order room for tracking
    socket.on('join:order', (data) => {
      const { orderId } = data || {};
      if (orderId) {
        const orderRoom = `order:${orderId}`;
        socket.join(orderRoom);
        console.log(`Socket ${socket.id} joined order room: ${orderRoom}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = setupSockets;