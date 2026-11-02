import { Router } from 'express';
import mongoose from 'mongoose';
import Project from '../models/Project.js';
import VisitSlot from '../models/VisitSlot.js';
import { getAvailableSlots } from '../services/booking.js';

const router = Router();
router.get('/projects', async (req, res) => {
  const projects = await Project.find({ published: true }).sort({ name: 1 }).lean();
  res.json({ projects });
});
router.get('/projects/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid project id.' });
  const project = await Project.findById(req.params.id).lean();
  if (!project || !project.published) return res.status(404).json({ error: 'Project not found.' });
  res.json({ project });
});
router.get('/slots', async (req, res) => {
  const { projectId } = req.query;
  if (!projectId || !mongoose.isValidObjectId(projectId)) return res.status(400).json({ error: 'A valid projectId is required.' });
  const slots = await getAvailableSlots({ projectId, from: req.query.from ? new Date(req.query.from) : new Date(), days: Number(req.query.days) || 14 });
  res.json({ slots });
});
export default router;
