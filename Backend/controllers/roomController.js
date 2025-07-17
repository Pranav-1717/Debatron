import * as roomService from '../services/roomService.js';
const Participation = require('../models/Participation.js');
const Topic = require('../models/Topic.js');
const User = require('../models/User.js');

/**
 * Handles request to join a topic (ranked or contest)
 * Expects body: { topicId, mode: 'ranked' | 'contest' }
 */
const joinRoom = async (req, res) => {
  try {
    const userId = req.user._id; // set by auth middleware
    const { topicId } = req.body;
    const topic = Topic.findOne({ _id: topicId })
    
    if(!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    const user = await User.findById(userId);
    if(user.isPremium === false && topic.isPremium === true ) {
      return res.status(403).json({ error: 'Contest not allowed for non-premium users' });
    }

    var mode = 'contest'; // default to contest
    if (await Participation.findOne({ userId, topicId })){
      mode = 'contest';
    }

    const result = await roomService.joinTopic({ userId, topicId, mode });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

module.exports = joinRoom
