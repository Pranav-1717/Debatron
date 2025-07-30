// E:\Debatron\Backend\models\User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Make sure you have bcryptjs installed (npm install bcryptjs)

const styleProfileSchema = new mongoose.Schema({
  tone:       String,
  logic:      String,
  aggression: Number,
});

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, unique: true }, // Added unique for username
  email:       { type: String, required: true, unique: true },
  password:    { type: String, required: true }, // This will store the HASHED password
  isPremium:   { type: Boolean, default: false },
  debateHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Debate' }], // Corrected ref to 'Debate'
  profileScore:  { type: Number, default: 0 },
  styleProfile:  styleProfileSchema,
  createdAt:   { type: Date, default: Date.now },
});

// Pre-save hook to hash password before saving a new or modified password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare password (useful for login)
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);