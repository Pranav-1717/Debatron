const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
  title:       { type: String, required: true, unique: true },
  description: { type: String },
  isPremium:   { type: Boolean, default: false },
  tags:        [String],
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('Topic', topicSchema);
