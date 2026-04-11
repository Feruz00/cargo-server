const { createClient } = require('redis');

const redis = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
});

redis.on('connect', () => {
  console.log('🔗 Redis socket connected');
});

redis.on('ready', () => {
  console.log('✅ Redis ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('end', () => {
  console.log('🛑 Redis connection closed');
});
const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log('✅ Redis connected');
  }
};

module.exports = {
  redis,
  connectRedis,
};
