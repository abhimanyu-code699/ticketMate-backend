const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoute');
const redisClient = require('./config/redis');

dotenv.config();

const app = express();

//database
require('./config/db');
require('./config/redis');
app.use(express.json());

//api
app.use('/api',authRoutes);
app.get('/',async(req,res)=>{
    res.send('TicketMate-Backend🔥');
})

app.get('/test-redis',async(req,res)=>{
    try {
        await redisClient.set('hello','world');
        const value = await redisClient.get('hello');
        res.json({message:'Redis working',value});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Redis test failed' });
    }
})
const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})