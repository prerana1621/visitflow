import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import VisitSlot from '../models/VisitSlot.js';
import SiteVisit from '../models/SiteVisit.js';
import Lead from '../models/Lead.js';

export async function getAvailableSlots({ projectId, from = new Date(), days = 14 }) {
  const start = new Date(from);
  const end = new Date(start.getTime() + Math.min(Math.max(days, 1), 30) * 86400000);
  return VisitSlot.find({
    project: new mongoose.Types.ObjectId(projectId), active: true,
    startAt: { $gte: start, $lte: end },
    $expr: { $lt: ['$bookedCount', '$capacity'] },
  }).sort({ startAt: 1 }).limit(40).lean();
}

export async function reserveSlot({ leadId, slotId }) {
  const lead = await Lead.findById(leadId);
  if (!lead) throw Object.assign(new Error('Lead not found.'), { status: 404 });
  if (!lead.consentGiven) throw Object.assign(new Error('Booking requires enquiry consent.'), { status: 403 });

  const slot = await VisitSlot.findOneAndUpdate(
    { _id: slotId, active: true, startAt: { $gt: new Date() }, $expr: { $lt: ['$bookedCount', '$capacity'] } },
    { $inc: { bookedCount: 1 } },
    { new: true }
  );
  if (!slot) throw Object.assign(new Error('That time is no longer available. Please choose another slot.'), { status: 409 });

  let visit;
  try {
    const confirmationCode = `VF-${randomBytes(3).toString('hex').toUpperCase()}`;
    visit = await SiteVisit.create({ lead: lead._id, slot: slot._id, project: lead.project, confirmationCode });
    await Lead.updateOne({ _id: lead._id }, { $set: { status: 'Visit booked', lastActivityAt: new Date() } });
  } catch (error) {
    if (visit?._id) await SiteVisit.deleteOne({ _id: visit._id });
    await VisitSlot.updateOne({ _id: slot._id, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
    if (error?.code === 11000) throw Object.assign(new Error('You already have this visit booked.'), { status: 409 });
    throw error;
  }
  return SiteVisit.findById(visit._id).populate('slot').populate('project').lean();
}
