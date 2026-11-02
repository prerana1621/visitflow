import { Router } from 'express';
import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import Message from '../models/Message.js';
import ReminderLog from '../models/ReminderLog.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

const router = Router();
router.get('/', requireAuth, allowRoles('sales'), async (req, res) => {
  const [totalLeads, visits, confirmedVisits, showUps, completedOutcomes, firstResponses, sources, pendingHandoffs, reminders] = await Promise.all([
    Lead.countDocuments(),
    SiteVisit.countDocuments({ status: { $ne: 'CANCELLED' } }),
    SiteVisit.countDocuments({ status: 'CONFIRMED' }),
    SiteVisit.countDocuments({ status: 'VISITED' }),
    SiteVisit.countDocuments({ status: { $in: ['VISITED', 'NO_SHOW'] } }),
    Lead.find({ firstResponseAt: { $ne: null } }).select('createdAt firstResponseAt').lean(),
    Lead.aggregate([{ $group: { _id: '$source', leads: { $sum: 1 }, visits: { $sum: 0 } } }, { $sort: { leads: -1 } }]),
    Lead.countDocuments({ status: 'Handoff Required' }),
    ReminderLog.countDocuments(),
  ]);
  const avgResponseMinutes = firstResponses.length ? firstResponses.reduce((sum, lead) => sum + Math.max(0, (new Date(lead.firstResponseAt) - new Date(lead.createdAt)) / 60000), 0) / firstResponses.length : null;
  const sourceRows = await Promise.all(sources.map(async (source) => {
    const leadIds = await Lead.find({ source: source._id }).distinct('_id');
    const sourceVisits = await SiteVisit.countDocuments({ lead: { $in: leadIds }, status: { $ne: 'CANCELLED' } });
    const sourceShowUps = await SiteVisit.countDocuments({ lead: { $in: leadIds }, status: 'VISITED' });
    return { source: source._id || 'Unknown', leads: source.leads, visits: sourceVisits, showUps: sourceShowUps, costPerVisit: null };
  }));
  res.json({ metrics: {
    totalLeads, totalVisits: visits, confirmedVisits, showUps, completedOutcomes,
    showUpRate: completedOutcomes ? Math.round((showUps / completedOutcomes) * 100) : null,
    visitRate: totalLeads ? Math.round((visits / totalLeads) * 100) : 0,
    avgResponseMinutes: avgResponseMinutes === null ? null : Math.round(avgResponseMinutes),
    pendingHandoffs, reminderLogs: reminders,
  }, sources: sourceRows, note: 'Show-up rate uses completed visit outcomes (visited / visited plus no-show); pending and cancelled visits are excluded. Cost per visit is unavailable until source-wise media spend is configured.' });
});
export default router;
