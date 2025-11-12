import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true, // Provided by both manual signup and Google
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, 
  },
  password: {
    type: String,
    // Not required because of Google OAuth
  },
  authMethod: {
    type: String,
    enum: ['local', 'google'],
    required: true,
  },
  isVerified: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true 
});

export default mongoose.model('UserCredentials', userSchema);