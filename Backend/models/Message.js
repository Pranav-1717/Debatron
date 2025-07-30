// E:\Debatron\Backend\models\Message.js
const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  text: String,
  aiScore: { // AI score for this specific sentence (optional, if you score per sentence)
    clarity: Number,
    logic: Number,
    tone: String,
    overall: Number
  }
}, { _id: false }); // No individual _id for sentences within a message


const messageSchema = new mongoose.Schema({
  debateId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true },
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentences: [sentenceSchema], // Multiple sentences per turn
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);