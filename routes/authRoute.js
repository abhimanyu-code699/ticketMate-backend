const express = require('express');
const { 
    registerUser, 
    verifyAccount
} = require('../controllers/authController');

const router = express.Router();

router.post('/register',registerUser);
router.post('/verify',verifyAccount);

module.exports = router;