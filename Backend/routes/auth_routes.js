const express = require('express');
const router = express.Router();
const validateToken = require('../middlewares/authmiddleware');
const {signUp, login} = require('../controllers/authController');

router.post('/signup',signUp);
router.post('/login', validateToken , login);

module.exports = router;