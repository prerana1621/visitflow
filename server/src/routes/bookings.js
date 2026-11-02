import { Router } from 'express';
import { z } from 'zod';
import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import VisitSlot from '../models/VisitSlot.js';
import { requireAuth } from '../middleware/auth.js';
import { reserveSlot } from '../services/booking.js';

const router = Router();

router.get('/mine', requireAuth, async (req, res) => {
  let leadIds;
  if (req.user.role === 'buyer') {
    const leads = await Lead.find({ normalisedPhone: req.user.phone }).select('_id');
    leadIds = leads.map((x) => x._id);
  }
  const visits = await SiteVisit.find(leadIds ? { lead: { $in: leadIds } } : {})
    .populate({ path: 'lead', select: 'leadCode name phone project', populate: { path: 'project', select: 'name code' } })
    .populate('slot project')
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ visits });
});

router.post('/', requireAuth, async (req, res) => {
  const body = z.object({ leadId: z.string().min(1), slotId: z.string().min(1) }).parse(req.body);
  const lead = await Lead.findById(body.leadId);
  if (!lead) return res.status(404).json({ error: 'Enquiry not found.' });
  if (req.user.role === 'buyer' && lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'You can only book for your own enquiry.' });
  const visit = await reserveSlot(body);
  res.status(201).json({ visit, message: 'Your site visit is confirmed.' });
});

router.post('/:id/cancel', requireAuth, async (req, res) => {
  const visit = await SiteVisit.findById(req.params.id).populate('lead slot');
  if (!visit) return res.status(404).json({ error: 'Visit not found.' });
  if (req.user.role === 'buyer' && visit.lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'Not allowed.' });
  const cancelled = await SiteVisit.findOneAndUpdate(
    { _id: visit._id, status: 'CONFIRMED' },
    { $set: { status: 'CANCELLED' } },
    { new: true }
  );
  if (!cancelled) return res.status(409).json({ error: 'This visit has already changed. Refresh before trying again.' });
  const released = await VisitSlot.updateOne({ _id: visit.slot._id, bookedCount: { $gt: 0 } }, { $inc: { bookedCount: -1 } });
  if (released.modifiedCount !== 1) {
    await SiteVisit.updateOne({ _id: visit._id, status: 'CANCELLED' }, { $set: { status: 'CONFIRMED' } });
    return res.status(409).json({ error: 'The slot count could not be released. The visit remains confirmed; please contact the sales team.' });
  }
  res.json({ message: 'Visit cancelled.' });
});

export default router;
