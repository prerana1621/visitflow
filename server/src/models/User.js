import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  phone: { type: String, trim: true, sparse: true, unique: true },
  passwordHash: { type: String, select: false },
  role: { type: String, enum: ['buyer', 'sales'], required: true, default: 'buyer' },
  isAdmin: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', userSchema);
