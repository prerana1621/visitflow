import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  city: { type: String, default: 'Ahmedabad' },
  configurations: [{ type: String, enum: ['2 BHK', '3 BHK'] }],
  priceRangeText: { type: String, default: 'Indicative portfolio range: INR 65 lakh - INR 1.2 crore' },
  description: { type: String, maxlength: 2000 },
  totalApartments: { type: Number, default: 420 },
  registrationNumber: { type: String, default: '' },
  verifiedAddress: { type: String, default: '' },
  published: { type: Boolean, default: true },
  factSheetUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
