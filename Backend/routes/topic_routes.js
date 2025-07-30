// E:\Debatron\Backend\routes\topic_routes.js
const express = require('express');
const router = express.Router();
const { createTopic , getTopic , getAllTopics } = require('../controllers/topic_controller');

router.post('/create', createTopic); // Can be protected with validateToken if needed
router.get('/:id', getTopic);
router.get('/', getAllTopics); // This is the API to list topics on frontend

module.exports = router;