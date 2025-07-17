const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema({
  topicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  scores:        { type: Map, of: Number }, // userId → cumulative score
  winner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPremiumRoom: { type: Boolean, default: false },
  status:        { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model('Debate', debateSchema);