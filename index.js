const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

app.use(express.json());

app.get('/',async(req,res)=>{
    res.send('TicketMate-Backend🔥');
})


const PORT = process.env.PORT || 8000
app.listen(PORT,()=>{
    console.log(`server is running at port ${PORT}`);
})