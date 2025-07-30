// E:\Debatron\Backend\models\Debate.js
const mongoose = require('mongoose');

const debateSchema = new mongoose.Schema({
  topicId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  participants:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
  scores:        { type: Map, of: Object }, // Changed 'Number' to 'Object' to store full AI score results per user
  winner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPremiumRoom: { type: Boolean, default: false },
  status:        { type: String, enum: ['pending', 'ongoing', 'finished', 'cancelled', 'closed'], default: 'pending' }, // Added 'cancelled', 'closed'
  createdAt:     { type: Date, default: Date.now },
  startedAt:     { type: Date }, // When the debate officially started (after WAIT_SECONDS)
});

module.exports = mongoose.model('Debate', debateSchema);