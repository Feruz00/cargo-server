const rateLimit = require('express-rate-limit');
const { default: Redis } = require('ioredis');
const { RedisStore } = require('rate-limit-redis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
    prefix: 'rate-limit:auth:',
  }),

  windowMs: 10 * 60 * 1000,
  max: 5,

  message: {
    message:
      'Too many login attempts from this IP. Please try again after 10 minutes.',
  },

  handler: (req, res) => {
    console.log('BLOCKED IP:', req.ip);
    res.status(429).json({
      message: 'Too many login attempts. Try again later.',
    });
  },
});

module.exports = authRateLimiter;
