import SiteVisit from '../models/SiteVisit.js';
import Lead from '../models/Lead.js';
import ReminderLog from '../models/ReminderLog.js';
import VisitSlot from '../models/VisitSlot.js';

// Provider boundary: this demo writes a delivery log and never contacts a real phone number.
async function sendMockMessage({ visit, lead, slot, type }) {
  if (!lead.consentGiven || lead.optOut) {
    await ReminderLog.updateOne({ visit: visit._id, type }, { $setOnInsert: { status: 'SKIPPED_OPT_OUT', detail: 'Consent absent or opt-out active.' } }, { upsert: true });
    return 'SKIPPED_OPT_OUT';
  }
  await ReminderLog.updateOne({ visit: visit._id, type }, {
    $setOnInsert: { status: 'SENT_SIMULATED', channel: 'WhatsApp', detail: `Simulated ${type} reminder for ${slot.startAt.toISOString()}.` },
  }, { upsert: true });
  return 'SENT_SIMULATED';
}

export async function processDueReminders(now = new Date()) {
  const visits = await SiteVisit.find({ status: 'CONFIRMED' }).limit(500).lean();
  let processed = 0;
  for (const visit of visits) {
    const [slot, lead] = await Promise.all([VisitSlot.findById(visit.slot).lean(), Lead.findById(visit.lead).lean()]);
    if (!slot || !lead) continue;
    for (const rule of [{ type: '24_HOUR', hours: 24 }, { type: '2_HOUR', hours: 2 }]) {
      const target = slot.startAt.getTime() - rule.hours * 3600000;
      const windowStart = target;
      const windowEnd = target + 60000;
      if (now.getTime() >= windowStart && now.getTime() < windowEnd) {
        await sendMockMessage({ visit, lead, slot, type: rule.type });
        processed += 1;
      }
    }
  }
  return processed;
}
