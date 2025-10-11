const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const authRoutes = require('./routes/authRoute');

dotenv.config();

const app = express();

//database
require('./config/db');

app.use(express.json());

//api
app.use('/api',authRoutes);
app.get('/',async(req,res)=>{
    res.send('TicketMate-Backend🔥');
})


const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})