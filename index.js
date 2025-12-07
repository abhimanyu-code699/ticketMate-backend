const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoute');
const ticketRoutes = require('./routes/ticketRoute');
const redisClient = require('./config/redis');
const uploadDocuments = require('./routes/documentUpload');
const stationCode = require('./routes/stationCodes');

dotenv.config();

const app = express();

app.use(cors());

//database
require('./config/db');

app.use(express.json());

//api
app.use('/api',authRoutes);
app.use('/api',ticketRoutes);
app.use('/api',uploadDocuments);
app.use('/api',stationCode);

app.get('/',async(req,res)=>{
    res.send('TicketMate-Backend🔥');
})

const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})