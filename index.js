require('dotenv').config();
const http = require('http');

const PORT = process.env.PORT || 8080;
const app = require('./app');
const server = http.createServer(app);
const db = require('./models');
const { connectRedis, redis } = require('./config/redis');
const { initializeSocket, addUser, removeUser } = require('./socket');

async function startServer() {
  try {
    await connectRedis();
    if (process.env.NODE_ENV !== 'production') {
      await redis.flushDb();
      console.log('🧹 Redis flushed on startup');
    }
    await db.sequelize.authenticate();
    console.log('✅ Database connected successfully.');

    const io = await initializeSocket(server);
    io.on('connection', async (socket) => {
      const userId = socket.handshake.query.id;
      const role = socket.handshake.query.role;
      console.log(`User with ID ${userId} ${role} connected with ${socket.id}`);

      socket.join(userId);

      if (role === 'head') {
        console.log('Head yorite room-a goshuldy');
        socket.join('head-room');
      }

      let users = await addUser(userId, socket.id);
      io.emit('onlineUsers', users);
      socket.on('disconnect', async () => {
        const { onlineUsers, userId } = await removeUser(socket.id);
        io.emit('onlineUsers', onlineUsers);

        console.log(`Client disconnected ${userId}`);
      });
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server started on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    console.log(error);
    console.log('⏳ Retrying server start in 5s...');
  }
}

startServer();

async function gracefulShutdown() {
  console.log('🛑 Gracefully shutting down...');

  try {
    if (process.env.NODE_ENV !== 'production') {
      await redis.flushDb();
      console.log('🧹 Redis DB flushed.');
    }

    await redis.close();
    await db.sequelize.close();

    process.exit(0);
  } catch (err) {
    console.error('Shutdown error:', err);
    process.exit(1);
  }
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled Rejection:', reason);
  gracefulShutdown();
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown();
});
