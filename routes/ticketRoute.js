const express = require('express');
const { verifyToken } = require('../middleware/verifyToken');
const upload = require("../middleware/multer"); 
const { 
    getUploadedTickets, 
    uploadTicket, 
    getTicket,
    ticketHistory,
    updateUploadedTicketStatus,
    updateGetTicketStatus
} = require('../controllers/ticketController');

const router = express.Router();

router.get('/getAllTickets',verifyToken,getUploadedTickets);
router.post(
  "/upload-ticket",
  verifyToken,
  upload.single("ticketFile"),
  uploadTicket
);
router.post("/getTicket",verifyToken,getTicket);
router.get('/ticketHistory',verifyToken,ticketHistory);
router.put('/update-uploaded-ticket-status',verifyToken,updateUploadedTicketStatus);
router.put('/update-get-ticket-status',verifyToken,updateGetTicketStatus);

module.exports = router;