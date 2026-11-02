import { Router } from 'express';
import { z } from 'zod';
import Project from '../models/Project.js';
import VisitSlot from '../models/VisitSlot.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const projectUpdate = z.object({
  description: z.string().max(2000).optional(),
  priceRangeText: z.string().max(180).optional(),
  registrationNumber: z.string().max(80).optional(),
  verifiedAddress: z.string().max(240).optional(),
  published: z.boolean().optional(),
}).strict();
const slotCreate = z.object({
  projectId: z.string().min(1), startAt: z.string().datetime(), endAt: z.string().datetime(),
  capacity: z.number().int().min(1).max(20).default(1), locationLabel: z.string().max(160).default('Project sales office (location confirmed by executive)'),
}).strict();

router.use(requireAuth, requireAdmin);
router.get('/fact-sheets', async (req, res) => {
  const projects = await Project.find().sort({ name: 1 }).lean();
  res.json({ projects });
});
router.patch('/fact-sheets/:id', async (req, res) => {
  const body = projectUpdate.parse(req.body);
  const project = await Project.findByIdAndUpdate(req.params.id, { $set: { ...body, factSheetUpdatedAt: new Date() } }, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project });
});
router.get('/slots', async (req, res) => {
  const slots = await VisitSlot.find().populate('project', 'name code').sort({ startAt: -1 }).limit(200).lean();
  res.json({ slots });
});
router.post('/slots', async (req, res) => {
  const body = slotCreate.parse(req.body);
  if (new Date(body.endAt) <= new Date(body.startAt)) return res.status(400).json({ error: 'End time must be after start time.' });
  const project = await Project.findById(body.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  const slot = await VisitSlot.create({ project: project._id, startAt: body.startAt, endAt: body.endAt, capacity: body.capacity, locationLabel: body.locationLabel });
  res.status(201).json({ slot });
});
router.patch('/slots/:id', async (req, res) => {
  const body = z.object({ active: z.boolean() }).strict().parse(req.body);
  const slot = body.active
    ? await VisitSlot.findByIdAndUpdate(req.params.id, { $set: { active: true } }, { new: true })
    : await VisitSlot.findOneAndUpdate({ _id: req.params.id, bookedCount: 0 }, { $set: { active: false } }, { new: true });
  if (!slot) {
    const existing = await VisitSlot.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Slot not found.' });
    return res.status(409).json({ error: 'A slot with existing bookings cannot be deactivated until visits are resolved.' });
  }
  res.json({ slot });
});
router.get('/executives', async (req, res) => {
  const executives = await User.find({ role: 'sales', active: true }).select('name email isAdmin').sort({ name: 1 }).lean();
  res.json({ executives });
});
export default router;
