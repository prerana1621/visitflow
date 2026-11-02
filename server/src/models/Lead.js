import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  leadCode: { type: String, unique: true, sparse: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true, index: true },
  normalisedPhone: { type: String, required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  source: { type: String, enum: ['Property portal', 'Social media ad', 'Website', 'Hoarding call', 'Referral', 'Walk-in'], default: 'Website' },
  sourceTags: [{ type: String }],
  wants: { type: String, enum: ['2 BHK', '3 BHK', 'Not sure'], default: 'Not sure' },
  budgetMin: { type: Number, min: 0, default: null },
  budgetMax: { type: Number, min: 0, default: null },
  timeline: { type: String, maxlength: 80, default: '' },
  language: { type: String, enum: ['English', 'Hindi', 'Gujarati'], default: 'English' },
  status: { type: String, enum: ['New', 'In conversation', 'Handoff Required', 'Visit booked', 'Visited', 'Closed'], default: 'New', index: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  consentGiven: { type: Boolean, required: true, default: false },
  consentAt: { type: Date, default: null },
  optOut: { type: Boolean, default: false },
  firstResponseAt: { type: Date, default: null },
  aiSummary: { type: String, maxlength: 1500, default: '' },
  lastActivityAt: { type: Date, default: Date.now },
  falseFlag: { type: Boolean, default: false },
}, { timestamps: true });

leadSchema.index({ normalisedPhone: 1, project: 1 }, { unique: true });
export default mongoose.models.Lead || mongoose.model('Lead', leadSchema);
