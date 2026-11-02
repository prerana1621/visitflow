import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from '../src/models/Project.js';
import Lead from '../src/models/Lead.js';
import VisitSlot from '../src/models/VisitSlot.js';
import SiteVisit from '../src/models/SiteVisit.js';
import ReminderLog from '../src/models/ReminderLog.js';
import { processDueReminders } from '../src/services/reminders.js';

let mongo; let project; let lead; let slot; let visit;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Project.init(), Lead.init(), VisitSlot.init(), SiteVisit.init(), ReminderLog.init()]);
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([ReminderLog.deleteMany({}), SiteVisit.deleteMany({}), VisitSlot.deleteMany({}), Lead.deleteMany({}), Project.deleteMany({})]);
  project = await Project.create({ code: 'REMINDER', name: 'Reminder project' });
  lead = await Lead.create({ leadCode: 'LD-REM', name: 'Demo buyer', phone: '+919000000009', normalisedPhone: '+919000000009', project: project._id, consentGiven: true });
  const now = new Date();
  slot = await VisitSlot.create({ project: project._id, startAt: new Date(now.getTime() + 24 * 3600000 - 30000), endAt: new Date(now.getTime() + 24 * 3600000 + 15 * 60000), capacity: 1, bookedCount: 1 });
  visit = await SiteVisit.create({ lead: lead._id, slot: slot._id, project: project._id, confirmationCode: 'VF-REMINDER', status: 'CONFIRMED' });
});

describe('scheduled reminder simulation', () => {
  it('writes one idempotent 24-hour reminder log', async () => {
    const now = new Date();
    await processDueReminders(now);
    await processDueReminders(now);
    expect(await ReminderLog.countDocuments({ visit: visit._id, type: '24_HOUR' })).toBe(1);
    expect(await ReminderLog.findOne({ visit: visit._id, type: '24_HOUR' }).then((x) => x.status)).toBe('SENT_SIMULATED');
  });
  it('records opt-out and never simulates delivery', async () => {
    lead.optOut = true; await lead.save();
    await processDueReminders(new Date());
    const log = await ReminderLog.findOne({ visit: visit._id, type: '24_HOUR' });
    expect(log.status).toBe('SKIPPED_OPT_OUT');
  });
});
