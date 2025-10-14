const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const { 
    getUploadedTickets, 
    uploadTicket, 
    getTicket
} = require('../controllers/ticketController');

const router = express.Router();

router.get('/getAllTickets',verifyToken,getUploadedTickets);
router.post('/uploadTicket',verifyToken,uploadTicket);
router.post("/getTicket",verifyToken,getTicket);

module.exports = router;