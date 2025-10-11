const redis = require('redis');

const redisClient = redis.createClient({
    url:process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('connect',()=>console.log('redis connected successfully✌️'));
redisClient.on('error',(err)=>console.log('redis connection failed',err));

(async()=>{
    await redisClient.connect();
})();

module.exports = redisClient;