import mongoose from 'mongoose';

const styleProfileSchema = new mongoose.Schema({
  tone:       String,
  logic:      String,
  aggression: Number,
});

const userSchema = new mongoose.Schema({
  username:      { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  password:      { type: String, required: true },
  isPremium:     { type: Boolean, default: false },
  debateHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DebateRoom' }],
  profileScore:  { type: Number, default: 0 },
  styleProfile:  styleProfileSchema,
  createdAt:     { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
