import mongoose from 'mongoose';

const siteVisitSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitSlot', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['CONFIRMED', 'CANCELLED', 'VISITED', 'NO_SHOW'], default: 'CONFIRMED', index: true },
  confirmationCode: { type: String, required: true, unique: true },
  reminder24hAt: { type: Date, default: null },
  reminder2hAt: { type: Date, default: null },
}, { timestamps: true });
siteVisitSchema.index({ lead: 1, slot: 1 }, { unique: true });
export default mongoose.models.SiteVisit || mongoose.model('SiteVisit', siteVisitSchema);
