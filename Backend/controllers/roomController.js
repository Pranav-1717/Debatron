// E:\Debatron\Backend\controllers\roomController.js
const roomService = require('../services/roomService');
// Participation model is not directly used for mode determination in simplified controller
// const Participation = require('../models/Participation.js');
const Topic = require('../models/Topic.js');
const User = require('../models/User.js');
const asyncHandler = require('express-async-handler');

// This file now only contains joinRoom for the simplified baseline.

/**
 * Handles request to join a topic. Simplified to a single debate type.
 * Expects body: { topicId } (mode is ignored for simplicity on frontend)
 * req.user._id is set by auth middleware (validateToken)
 */
const joinRoom = asyncHandler(async (req, res) => {
  console.log("Backend roomController: joinRoom called");
  console.log("req.user (from auth middleware):", req.user);
  console.log("req.body:", req.body);

  const userId = req.user._id;
  const { topicId } = req.body; // 'mode' is no longer expected or relevant here

  console.log("Extracted userId from req.user:", userId);
  console.log("Extracted topicId from req.body:", topicId);

  if (!topicId) {
    return res.status(400).json({ error: 'topicId is required.' });
  }

  // Fetch Topic and User documents
  const topic = await Topic.findById(topicId);
  console.log("Fetched topic in controller:", topic ? `Found topic: ${topic.title}` : 'Topic not found');

  if (!topic) {
    return res.status(404).json({ error: 'Topic not found.' });
  }

  const user = await User.findById(userId);
  console.log("Fetched user in controller:", user ? `Found user: ${user.username}` : 'User not found');

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Rule: Non-premium users cannot join premium topics (if isPremium is true on Topic)
  if (user.isPremium === false && topic.isPremium === true) {
    return res.status(403).json({ error: 'Access denied: Cannot join premium topics with a non-premium account.' });
  }

  // --- SIMPLIFIED CALL: Always call joinDebate, no complex mode determination here ---
  // The 'mode' logic (ranked/contest based on Participation) is removed from the controller
  // and is implicit in roomService.joinDebate (which now always creates Mongoose-backed rooms).
  const result = await roomService.joinDebate({ userId, topicId }); // Call the new, simplified function
  res.json(result); // Respond with the roomId (always Mongoose ObjectId now)
});

module.exports = {
  joinRoom
};