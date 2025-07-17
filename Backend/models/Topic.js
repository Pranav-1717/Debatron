import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema({
  title:       { type: String, required: true, unique: true },
  description: { type: String },
  isPremium:   { type: Boolean, default: false },
  tags:        [String],
  createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('Topic', topicSchema);
