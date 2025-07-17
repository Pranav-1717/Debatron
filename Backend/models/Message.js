const mongoose = require('mongoose');

const sentenceSchema = new mongoose.Schema({
  text: String,
  aiScore: {
    clarity: Number,
    logic: Number,
    tone: String,
    overall: Number
  }
}, { _id: false });


const messageSchema = new mongoose.Schema({
  debateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sentences: [sentenceSchema], // multiple sentences per turn
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
