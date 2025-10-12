const express = require('express');
const { 
    registerUser, 
    verifyAccount,
    loginUser
} = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register',registerUser);
router.post('/verify',verifyAccount);
router.post('/login',loginLimiter,loginUser);

module.exports = router;