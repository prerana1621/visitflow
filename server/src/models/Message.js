import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  sender: { type: String, enum: ['buyer', 'assistant', 'sales'], required: true },
  body: { type: String, required: true, maxlength: 4000 },
  language: { type: String, enum: ['English', 'Hindi', 'Gujarati'], default: 'English' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });
export default mongoose.models.Message || mongoose.model('Message', messageSchema);
