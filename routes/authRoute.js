const express = require('express');
const { 
    registerUser, 
    verifyAccount,
    loginUser
} = require('../controllers/authController');

const router = express.Router();

router.post('/register',registerUser);
router.post('/verify',verifyAccount);
router.post('/login',loginUser);

module.exports = router;