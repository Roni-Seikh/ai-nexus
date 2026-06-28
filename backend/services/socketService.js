const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const connectedUsers = new Map();

exports.initializeSocketHandlers = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} user: ${socket.userId}`);
    connectedUsers.set(socket.userId, socket.id);

    socket.on('join_chat', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('typing_start', (chatId) => {
      socket.to(`chat:${chatId}`).emit('user_typing', { userId: socket.userId });
    });

    socket.on('typing_stop', (chatId) => {
      socket.to(`chat:${chatId}`).emit('user_stop_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.userId);
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};

exports.sendToUser = (io, userId, event, data) => {
  const socketId = connectedUsers.get(userId.toString());
  if (socketId) io.to(socketId).emit(event, data);
};
