// E:\Debatron\Backend\routes\auth_routes.js
const express = require('express');
const router = express.Router();
const {signup, login} = require('../controllers/Auth_controller');

router.post('/signup',signup);
router.post('/login' , login);

module.exports = router;