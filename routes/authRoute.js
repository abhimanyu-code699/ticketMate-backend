const express = require('express');
const { 
    registerUser, 
    verifyAccount,
    loginUser,
    forgetPassword,
    resetPassword
} = require('../controllers/authController');

const router = express.Router();

router.post('/register',registerUser);
router.post('/verify',verifyAccount);
router.post('/login',loginUser);
router.post('/forget-password',forgetPassword);
router.post('/reset-password',resetPassword);

module.exports = router;