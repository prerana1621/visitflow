import { Router } from 'express';
import { z } from 'zod';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Message from '../models/Message.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';
import { normalisePhone } from '../utils/phone.js';
import { summariseLead } from '../services/ai.js';

const router = Router();
const createSchema = z.object({
  name: z.string().min(2).max(100), projectId: z.string().min(1),
  source: z.enum(['Property portal', 'Social media ad', 'Website', 'Hoarding call', 'Referral', 'Walk-in']).default('Website'),
  wants: z.enum(['2 BHK', '3 BHK', 'Not sure']).default('Not sure'),
  language: z.enum(['English', 'Hindi', 'Gujarati']).default('English'),
  consentGiven: z.literal(true),
});
const updateSchema = z.object({
  status: z.enum(['New', 'In conversation', 'Handoff Required', 'Visit booked', 'Visited', 'Closed']).optional(),
  assignedTo: z.string().nullable().optional(), optOut: z.boolean().optional(), falseFlag: z.boolean().optional(),
  wants: z.enum(['2 BHK', '3 BHK', 'Not sure']).optional(),
}).strict();

async function ensureLeadAccess(req, res, next) {
  const lead = await Lead.findById(req.params.id).populate('project assignedTo');
  if (!lead) return res.status(404).json({ error: 'Lead not found.' });
  if (req.user.role === 'buyer' && (!lead.phone || lead.normalisedPhone !== req.user.phone)) return res.status(403).json({ error: 'You can only view your own enquiry.' });
  req.lead = lead;
  next();
}

router.post('/', requireAuth, allowRoles('buyer'), async (req, res) => {
  const body = createSchema.parse(req.body);
  if (!req.user.phone) return res.status(400).json({ error: 'Your account needs a verified mobile number.' });
  const project = await Project.findById(body.projectId);
  if (!project || !project.published) return res.status(404).json({ error: 'Project not found.' });
  const normalised = normalisePhone(req.user.phone);
  const sales = await User.find({ role: 'sales', active: true }).sort({ createdAt: 1 }).select('_id');
  const count = await Lead.countDocuments();
  const assignedTo = sales.length ? sales[count % sales.length]._id : null;
  const filter = { normalisedPhone: normalised, project: project._id };
  const existedBeforeWrite = Boolean(await Lead.exists(filter));
  const update = {
    $set: { name: body.name, wants: body.wants, language: body.language, consentGiven: true, consentAt: new Date(), lastActivityAt: new Date() },
    $setOnInsert: { phone: req.user.phone, normalisedPhone: normalised, project: project._id, source: body.source, assignedTo, leadCode: `LD-${Math.floor(10000 + Math.random() * 89999)}` },
    $addToSet: { sourceTags: body.source },
  };
  let duplicateReused = existedBeforeWrite;
  let lead;
  try {
    lead = await Lead.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true }).populate('project assignedTo');
  } catch (error) {
    // A concurrent upsert can lose the unique-index race. Re-read and update
    // the winner instead of returning a 500 or creating a second lead.
    if (error?.code !== 11000) throw error;
    duplicateReused = true;
    await Lead.updateOne(filter, { $set: update.$set, $addToSet: update.$addToSet });
    lead = await Lead.findOne(filter).populate('project assignedTo');
    if (!lead) throw error;
  }
  res.status(201).json({ lead, duplicateReused });
});

router.get('/', requireAuth, async (req, res) => {
  const filter = req.user.role === 'buyer' ? { normalisedPhone: req.user.phone } : {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.source) filter.source = req.query.source;
  const leads = await Lead.find(filter).populate('project assignedTo', 'name email code').sort({ lastActivityAt: -1 }).limit(200).lean();
  res.json({ leads });
});

router.get('/executives', requireAuth, allowRoles('sales'), async (req, res) => {
  const executives = await User.find({ role: 'sales', active: true }).select('name email isAdmin').sort({ name: 1 }).lean();
  res.json({ executives });
});

router.post('/:id/opt-out', requireAuth, ensureLeadAccess, async (req, res) => {
  if (req.user.role !== 'buyer' || req.lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'Only the buyer can change their contact preference.' });
  req.lead.optOut = true;
  await req.lead.save();
  res.json({ message: 'You are opted out. No further reminder or follow-up messages will be sent for this enquiry.', lead: { id: req.lead._id, optOut: true } });
});

router.get('/:id', requireAuth, ensureLeadAccess, async (req, res) => {
  const messages = await Message.find({ lead: req.lead._id }).sort({ createdAt: 1 }).lean();
  res.json({ lead: req.lead, messages });
});

router.patch('/:id', requireAuth, allowRoles('sales'), ensureLeadAccess, async (req, res) => {
  const changes = updateSchema.parse(req.body);
  if (changes.assignedTo) {
    const exec = await User.findOne({ _id: changes.assignedTo, role: 'sales', active: true });
    if (!exec) return res.status(400).json({ error: 'Choose an active sales executive.' });
  }
  Object.assign(req.lead, changes);
  await req.lead.save();
  res.json({ lead: await Lead.findById(req.lead._id).populate('project assignedTo').lean() });
});

router.post('/:id/handoff', requireAuth, ensureLeadAccess, async (req, res) => {
  if (req.user.role === 'buyer' && req.lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'Not allowed.' });
  const executives = await User.find({ role: 'sales', active: true }).sort({ createdAt: 1 }).select('_id');
  if (!executives.length) return res.status(503).json({ error: 'No active sales executive is available.' });
  const existingAssigned = req.lead.assignedTo?._id;
  const assigned = existingAssigned || executives[0]._id;
  const messages = await Message.find({ lead: req.lead._id }).sort({ createdAt: 1 }).limit(30).lean();
  let summary;
  try { summary = await summariseLead({ lead: req.lead, messages }); }
  catch { summary = `Buyer interested in ${req.lead.wants} at ${req.lead.project?.name || 'the selected project'}. Budget and timeline should be confirmed by the sales executive.`; }
  req.lead.assignedTo = assigned;
  req.lead.aiSummary = summary;
  req.lead.status = 'Handoff Required';
  req.lead.lastActivityAt = new Date();
  await req.lead.save();
  res.json({ lead: await Lead.findById(req.lead._id).populate('project assignedTo').lean(), summary });
});

export default router;
