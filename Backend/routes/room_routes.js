// E:\Debatron\Backend\routes\room_routes.js
const express = require('express');
const router = express.Router();
const { joinRoom } = require('../controllers/roomController'); // Only joinRoom is here now
const validateToken = require('../middlewares/authmiddleware'); // Import the token validation middleware

router.post('/join',validateToken, joinRoom); // This route is protected by validateToken in server.js

module.exports = router;