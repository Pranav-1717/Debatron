// E:\Debatron\Backend\models\Participation.js
const mongoose = require('mongoose');

const participationSchema = new mongoose.Schema(
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
    roomId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Debate', required: true }, // Corrected ref to 'Debate'
    joinedAt:{ type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Ensure only one ranked attempt per user/topic
participationSchema.index({ userId: 1, topicId: 1 }, { unique: true });

module.exports = mongoose.model('Participation', participationSchema);