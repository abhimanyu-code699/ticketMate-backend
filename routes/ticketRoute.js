const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const { 
    getUploadedTickets, 
    uploadTicket 
} = require('../controllers/ticketController');

const router = express.Router();

router.get('/getTickets',verifyToken,getUploadedTickets);
router.post('/uploadTicket',verifyToken,uploadTicket);

module.exports = router;