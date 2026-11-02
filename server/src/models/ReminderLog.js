import mongoose from 'mongoose';

const reminderLogSchema = new mongoose.Schema({
  visit: { type: mongoose.Schema.Types.ObjectId, ref: 'SiteVisit', required: true },
  type: { type: String, enum: ['24_HOUR', '2_HOUR'], required: true },
  channel: { type: String, enum: ['WhatsApp', 'SMS'], default: 'WhatsApp' },
  status: { type: String, enum: ['SENT_SIMULATED', 'SKIPPED_OPT_OUT', 'FAILED'], required: true },
  detail: { type: String, maxlength: 300, default: '' },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });
reminderLogSchema.index({ visit: 1, type: 1 }, { unique: true });
export default mongoose.models.ReminderLog || mongoose.model('ReminderLog', reminderLogSchema);
