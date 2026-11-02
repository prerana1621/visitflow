import { Router } from 'express';
import { z } from 'zod';
import Lead from '../models/Lead.js';
import Message from '../models/Message.js';
import VisitSlot from '../models/VisitSlot.js';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';
import { generateAssistantDecision, summariseLead } from '../services/ai.js';
import { getAvailableSlots } from '../services/booking.js';

const router = Router();
const messageSchema = z.object({ message: z.string().trim().min(1).max(2000) });

router.post('/:leadId/messages', requireAuth, async (req, res) => {
  const { message } = messageSchema.parse(req.body);
  const lead = await Lead.findById(req.params.leadId).populate('project');
  if (!lead) return res.status(404).json({ error: 'Enquiry not found.' });
  if (req.user.role === 'buyer' && lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'You can only message on your own enquiry.' });
  if (req.user.role === 'buyer' && lead.optOut) return res.status(403).json({ error: 'This enquiry is opted out. Contact the sales team directly.' });

  await Message.create({ lead: lead._id, sender: req.user.role === 'buyer' ? 'buyer' : 'sales', body: message, language: lead.language });
  const history = await Message.find({ lead: lead._id }).sort({ createdAt: 1 }).limit(20).lean();
  let decision;
  try {
    decision = await generateAssistantDecision({ message, project: lead.project, history: history.slice(0, -1), currentLead: lead });
  } catch (error) {
    decision = { reply: "I can't verify that right now. I'll connect you with a sales executive rather than guess.", language: lead.language, intent: 'human_help', extractedFields: { configuration: lead.wants, budgetMin: lead.budgetMin, budgetMax: lead.budgetMax, timeline: lead.timeline }, requestedAction: 'HANDOFF', needsHuman: true, aiAvailable: false };
  }

  const fields = decision.extractedFields;
  const update = { wants: fields.configuration, language: decision.language, lastActivityAt: new Date() };
  if (fields.budgetMin !== null) update.budgetMin = fields.budgetMin;
  if (fields.budgetMax !== null) update.budgetMax = fields.budgetMax;
  if (fields.timeline) update.timeline = fields.timeline;
  if (!lead.firstResponseAt) update.firstResponseAt = new Date();
  if (lead.status === 'New') update.status = 'In conversation';
  await Lead.updateOne({ _id: lead._id }, { $set: update });

  let availableSlots = [];
  if (decision.requestedAction === 'CHECK_AVAILABLE_SLOTS') {
    const slots = await getAvailableSlots({ projectId: lead.project._id.toString(), days: 14 });
    availableSlots = slots.slice(0, 5).map((slot) => ({ id: slot._id, startAt: slot.startAt, endAt: slot.endAt, locationLabel: slot.locationLabel }));
    if (availableSlots.length) decision.reply += `\n\nI found ${availableSlots.length} currently available visit time(s). Choose one below to confirm.`;
    else decision.reply += '\n\nI cannot see a free slot in the next 14 days. A sales executive can help arrange another time.';
  }

  const assistantMessage = await Message.create({
    lead: lead._id, sender: 'assistant', body: decision.reply, language: decision.language,
    metadata: { intent: decision.intent, needsHuman: decision.needsHuman, aiAvailable: decision.aiAvailable, requestedAction: decision.requestedAction },
  });
  if (decision.needsHuman || decision.requestedAction === 'HANDOFF') {
    // Persist a named owner and a reviewable summary; no outbound human message is sent.
    const latestLead = await Lead.findById(lead._id).populate('project').lean();
    const executives = latestLead?.assignedTo ? [] : await User.find({ role: 'sales', active: true }).sort({ createdAt: 1 }).select('_id').lean();
    let summary = '';
    try { summary = await summariseLead({ lead: latestLead || lead, messages: [...history, assistantMessage] }); }
    catch { summary = `Buyer interested in ${latestLead?.wants || lead.wants} at ${latestLead?.project?.name || lead.project?.name || 'the selected project'}. Budget and timeline should be confirmed by the assigned executive.`; }
    await Lead.updateOne({ _id: lead._id }, { $set: {
      status: 'Handoff Required', aiSummary: summary,
      ...(latestLead?.assignedTo ? {} : executives[0] ? { assignedTo: executives[0]._id } : {}),
    } });
  }
  res.json({ assistantMessage, decision: { intent: decision.intent, needsHuman: decision.needsHuman, aiAvailable: decision.aiAvailable }, availableSlots });
});

router.get('/:leadId/messages', requireAuth, async (req, res) => {
  const lead = await Lead.findById(req.params.leadId).lean();
  if (!lead) return res.status(404).json({ error: 'Enquiry not found.' });
  if (req.user.role === 'buyer' && lead.normalisedPhone !== req.user.phone) return res.status(403).json({ error: 'Not allowed.' });
  const messages = await Message.find({ lead: lead._id }).sort({ createdAt: 1 }).lean();
  res.json({ messages });
});

export default router;
