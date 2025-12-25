const mongoose = require("mongoose");

const pendingUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  verificationcode: {
    type: String,
    required: true
  },
  verificationcodeExpire: {
    type: Date,
    required: true
  },
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Create index for automatic cleanup of expired records
pendingUserSchema.index({ verificationcodeExpire: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("PendingUser", pendingUserSchema);