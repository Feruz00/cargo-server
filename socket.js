const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const { createClient } = require('redis');
const { redis } = require('./config/redis');

let io;
async function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      transports: ['websocket', 'polling'],
      credentials: true,
    },
    allowEIO3: true,
  });

  const pubClient = createClient({
    url: `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || 6379}`,
  });
  // const pubClient = new Redis({
  //   host: process.env.REDIS_HOST || '127.0.0.1',
  //   port: process.env.REDIS_PORT || 6379,
  // });

  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  console.log('✅ Socket.io Redis adapter enabled');

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

const addUser = async (userId, socketId) => {
  const key = `user-${userId}`;

  const index = await redis.LPOS(key, socketId);
  if (index === null) {
    await redis.LPUSH(key, socketId);
  }

  await redis.SET(`socket-user-${socketId}`, userId);

  return await getOnlineUsersWithSockets(redis);
};

const removeUser = async (socketId) => {
  const userId = await redis.GET(`socket-user-${socketId}`);

  if (userId) {
    const key = `user-${userId}`;
    await redis.LREM(key, 0, socketId);
    const remainingSockets = await redis.LRANGE(key, 0, -1);
    if (remainingSockets.length === 0) {
      await redis.DEL(key);
    }
    await redis.DEL(`socket-user-${socketId}`);
  }

  const onlineUsers = await getOnlineUsersWithSockets(redis);

  return { onlineUsers, userId };
};

const getOnlineUsersWithSockets = async () => {
  const result = [];

  const keys = await redis.KEYS('user-*');

  for (const key of keys) {
    const userId = key.split('-')[1];

    const socketIds = await redis.LRANGE(key, 0, -1);

    result.push({
      userId,
      socketIds,
    });
  }

  console.log('Online users with sockets:', result);

  return result;
};
module.exports = {
  initializeSocket,
  getIO,
  addUser,
  removeUser,
  getOnlineUsersWithSockets,
};
