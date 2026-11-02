import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Project from '../src/models/Project.js';
import Lead from '../src/models/Lead.js';
import VisitSlot from '../src/models/VisitSlot.js';
import SiteVisit from '../src/models/SiteVisit.js';
import { reserveSlot } from '../src/services/booking.js';

let mongo;
let project;
let lead;
let slot;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  await Promise.all([Project.init(), Lead.init(), VisitSlot.init(), SiteVisit.init()]);
});
afterAll(async () => { await mongoose.disconnect(); await mongo.stop(); });
beforeEach(async () => {
  await Promise.all([Project.deleteMany({}), Lead.deleteMany({}), VisitSlot.deleteMany({}), SiteVisit.deleteMany({})]);
  project = await Project.create({ code: 'TEST', name: 'Test project', configurations: ['2 BHK'] });
  lead = await Lead.create({ leadCode: 'LD-TEST', name: 'Demo buyer', phone: '+919000000001', normalisedPhone: '+919000000001', project: project._id, consentGiven: true });
  slot = await VisitSlot.create({ project: project._id, startAt: new Date(Date.now() + 3600000), endAt: new Date(Date.now() + 6300000), capacity: 1, bookedCount: 0, active: true });
});

describe('site visit reservation', () => {
  it('allows only one of two concurrent buyers to reserve a capacity-one slot', async () => {
    const secondLead = await Lead.create({ leadCode: 'LD-TEST-2', name: 'Another buyer', phone: '+919000000002', normalisedPhone: '+919000000002', project: project._id, consentGiven: true });
    const outcomes = await Promise.allSettled([
      reserveSlot({ leadId: lead._id.toString(), slotId: slot._id.toString() }),
      reserveSlot({ leadId: secondLead._id.toString(), slotId: slot._id.toString() }),
    ]);
    expect(outcomes.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((x) => x.status === 'rejected')).toHaveLength(1);
    expect((await VisitSlot.findById(slot._id)).bookedCount).toBe(1);
    expect(await SiteVisit.countDocuments({ slot: slot._id, status: 'CONFIRMED' })).toBe(1);
  });
  it('still permits a buyer-initiated booking after opting out of follow-up messages', async () => {
    lead.optOut = true; await lead.save();
    const visit = await reserveSlot({ leadId: lead._id.toString(), slotId: slot._id.toString() });
    expect(visit.status).toBe('CONFIRMED');
    expect((await VisitSlot.findById(slot._id)).bookedCount).toBe(1);
  });
  it('refuses booking if enquiry consent is absent', async () => {
    lead.consentGiven = false; await lead.save();
    await expect(reserveSlot({ leadId: lead._id.toString(), slotId: slot._id.toString() })).rejects.toMatchObject({ status: 403 });
    expect((await VisitSlot.findById(slot._id)).bookedCount).toBe(0);
  });
  it('refuses a slot that has passed', async () => {
    slot.startAt = new Date(Date.now() - 60000); await slot.save();
    await expect(reserveSlot({ leadId: lead._id.toString(), slotId: slot._id.toString() })).rejects.toMatchObject({ status: 409 });
  });
});
