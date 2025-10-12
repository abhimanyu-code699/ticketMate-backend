const express = require('express');
const { 
    registerUser, 
    verifyAccount,
    loginUser,
    forgetPassword,
    resetPassword
} = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register',registerUser);
router.post('/verify',verifyAccount);
router.post('/login',loginLimiter,loginUser);
router.post('/forget-password',forgetPassword);
router.post('/reset-password',resetPassword);

module.exports = router;