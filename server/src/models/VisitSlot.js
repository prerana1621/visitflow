import mongoose from 'mongoose';

const visitSlotSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  executive: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  startAt: { type: Date, required: true, index: true },
  endAt: { type: Date, required: true },
  capacity: { type: Number, min: 1, default: 1 },
  bookedCount: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true },
  locationLabel: { type: String, default: 'Project sales office (location confirmed by executive)' },
}, { timestamps: true });
visitSlotSchema.index({ project: 1, startAt: 1 }, { unique: true });
export default mongoose.models.VisitSlot || mongoose.model('VisitSlot', visitSlotSchema);
