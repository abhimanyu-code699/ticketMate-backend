// const rateLimit = require('express-rate-limit');
// const RedisStore = require('rate-limit-redis').default;
// const redisClient = require('../config/redis');

// //login rate limiter
// const loginLimiter = rateLimit({
//      store: new RedisStore({
//         sendCommand: (...args) => redisClient.sendCommand(args)
//     }),
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 5, // limit each IP to 5 requests per windowMs
//     message: 'Too many login attempts, please try again after 15 minutes'

// })

// module.exports = { loginLimiter };