const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoute');
const ticketRoutes = require('./routes/ticketRoute');
const redisClient = require('./config/redis');

dotenv.config();

const app = express();

app.use(cors());

//database
require('./config/db');
require('./config/redis');
app.use(express.json());

//api
app.use('/api',authRoutes);
app.use('/api',ticketRoutes);

app.get('/',async(req,res)=>{
    res.send('TicketMate-Backend🔥');
})

const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})