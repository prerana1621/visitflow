import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Lead from '../models/Lead.js';
import Message from '../models/Message.js';
import VisitSlot from '../models/VisitSlot.js';
import SiteVisit from '../models/SiteVisit.js';
import ReminderLog from '../models/ReminderLog.js';

const at = (date, time) => new Date(`${date}T${time}:00+05:30`);

async function upsertUser({ email, name, phone, password, role, isAdmin = false }) {
  const filter = email ? { email } : { phone };
  const update = { name, phone, role, isAdmin, active: true };
  if (password) update.passwordHash = await bcrypt.hash(password, 12);
  return User.findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function run() {
  await connectDatabase();
  const buyer = await upsertUser({ phone: '+910000000001', name: 'Demo buyer', role: 'buyer' });
  const sales1 = await upsertUser({ email: 'sales@visitflow.demo', name: 'Aarohi Shah', password: 'Demo@123!', role: 'sales' });
  const sales2 = await upsertUser({ email: 'sales2@visitflow.demo', name: 'Rohan Desai', password: 'Demo@123!', role: 'sales' });
  await upsertUser({ email: 'admin@visitflow.demo', name: 'Meera Patel', password: 'Demo@123!', role: 'sales', isAdmin: true });

  const project1 = await Project.findOneAndUpdate({ code: 'PROJECT_1' }, { $set: {
    name: 'Project 1', city: 'Ahmedabad', configurations: ['2 BHK', '3 BHK'],
    priceRangeText: 'Indicative portfolio range: INR 65 lakh - INR 1.2 crore (not a unit quote)',
    description: 'A live residential project in the developer portfolio. Exact amenities, unit pricing, possession details and location must be confirmed by a sales executive.',
    totalApartments: 420, registrationNumber: '', verifiedAddress: '', published: true,
  } }, { new: true, upsert: true });
  const project2 = await Project.findOneAndUpdate({ code: 'PROJECT_2' }, { $set: {
    name: 'Project 2', city: 'Ahmedabad', configurations: ['2 BHK', '3 BHK'],
    priceRangeText: 'Indicative portfolio range: INR 65 lakh - INR 1.2 crore (not a unit quote)',
    description: 'A live residential project in the developer portfolio. Exact amenities, unit pricing, possession details and location must be confirmed by a sales executive.',
    totalApartments: 420, registrationNumber: '', verifiedAddress: '', published: true,
  } }, { new: true, upsert: true });

  const sampleRows = [
    { leadCode: 'LD-58210', name: 'Hardik Patel', phone: '+910000000412', project: project1._id, source: 'Property portal', wants: '3 BHK', status: 'Visit booked', assignedTo: sales1._id, firstResponseAt: new Date('2026-10-20T10:10:00+05:30'), createdAt: new Date('2026-10-20T10:00:00+05:30'), budgetMin: null, budgetMax: null },
    { leadCode: 'LD-58211', name: 'Nidhi Shah', phone: '+910000000587', project: project2._id, source: 'Social media ad', wants: '2 BHK', status: 'New', assignedTo: sales2._id, firstResponseAt: null, createdAt: new Date('2026-10-30T14:15:00+05:30'), budgetMin: null, budgetMax: null },
    { leadCode: 'LD-58224', name: 'Kavita Joshi', phone: '+910000000224', project: project2._id, source: 'Hoarding call', wants: '2 BHK', status: 'Visited', assignedTo: sales1._id, firstResponseAt: new Date('2026-10-25T09:08:00+05:30'), createdAt: new Date('2026-10-25T09:00:00+05:30'), budgetMin: null, budgetMax: null },
  ];
  const leads = [];
  for (const row of sampleRows) {
    const lead = await Lead.findOneAndUpdate({ leadCode: row.leadCode }, { $set: {
      ...row, normalisedPhone: row.phone, sourceTags: [row.source], consentGiven: true,
      consentAt: row.createdAt, language: 'English', lastActivityAt: row.createdAt,
      timeline: '', aiSummary: '', optOut: false,
    } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    leads.push(lead);
  }

  await Message.deleteMany({ lead: { $in: leads.map((x) => x._id) } });
  await Message.create([
    { lead: leads[0]._id, sender: 'buyer', body: 'I am looking for a 3 BHK and would like to see the project.', language: 'English', createdAt: new Date('2026-10-20T10:04:00+05:30') },
    { lead: leads[0]._id, sender: 'assistant', body: 'I can help arrange a visit. A sales executive will confirm the verified address and unit-specific details.', language: 'English', createdAt: new Date('2026-10-20T10:04:30+05:30') },
    { lead: leads[1]._id, sender: 'buyer', body: 'I saw your social media post. Could you share 2 BHK information?', language: 'English', createdAt: new Date('2026-10-30T14:15:00+05:30') },
    { lead: leads[2]._id, sender: 'buyer', body: 'I called after seeing the hoarding and visited the project.', language: 'English', createdAt: new Date('2026-10-25T09:02:00+05:30') },
    { lead: leads[2]._id, sender: 'sales', body: 'Thank you for visiting. Please let us know if you would like any verified details.', language: 'English', createdAt: new Date('2026-10-25T09:08:00+05:30') },
  ]);

  // Historical sample visits preserve the dates/status supplied by the brief.
  const hardikSlot = await VisitSlot.findOneAndUpdate({ project: project1._id, startAt: at('2026-11-01', '11:00') }, { $set: { endAt: at('2026-11-01', '11:45'), capacity: 1, bookedCount: 1, active: false } }, { new: true, upsert: true });
  await SiteVisit.findOneAndUpdate({ confirmationCode: 'VF-DEMO10' }, { $set: { lead: leads[0]._id, slot: hardikSlot._id, project: project1._id, status: 'CONFIRMED' } }, { upsert: true, new: true });
  const kavitaSlot = await VisitSlot.findOneAndUpdate({ project: project2._id, startAt: at('2026-10-25', '12:00') }, { $set: { endAt: at('2026-10-25', '12:45'), capacity: 1, bookedCount: 1, active: false } }, { new: true, upsert: true });
  await SiteVisit.findOneAndUpdate({ confirmationCode: 'VF-DEMO24' }, { $set: { lead: leads[2]._id, slot: kavitaSlot._id, project: project2._id, status: 'VISITED' } }, { upsert: true, new: true });

  // Seed future slots at 11:00, 14:00 and 16:00 Ahmedabad time regardless of host timezone.
  const todayParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const today = Object.fromEntries(todayParts.map((part) => [part.type, part.value]));
  const todayUtc = Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day));
  for (const project of [project1, project2]) {
    for (let day = 0; day < 10; day += 1) {
      const date = new Date(todayUtc + (day + 1) * 86400000).toISOString().slice(0, 10);
      for (const hour of [11, 14, 16]) {
        const start = at(date, `${String(hour).padStart(2, '0')}:00`);
        const end = new Date(start.getTime() + 45 * 60000);
        await VisitSlot.findOneAndUpdate({ project: project._id, startAt: start }, { $setOnInsert: {
          project: project._id, startAt: start, endAt: end, capacity: 1, bookedCount: 0, active: true,
          locationLabel: 'Project sales office (location confirmed by executive)',
        } }, { upsert: true, new: true });
      }
    }
  }

  // Ensure repeatable seed runs do not leave test reminders attached to sample records.
  await ReminderLog.deleteMany({ visit: { $in: await SiteVisit.find({ lead: { $in: leads.map((x) => x._id) } }).distinct('_id') } });
  console.log('VisitFlow demo data is ready.');
  console.log('Buyer OTP login: 0000000001 / 246810');
  console.log('Sales login: sales@visitflow.demo / Demo@123!');
  console.log('Admin login: admin@visitflow.demo / Demo@123!');
  console.log('Do not use these fictional demo phone numbers for real messaging.');
  await (await import('mongoose')).default.disconnect();
}

run().catch(async (error) => { console.error(error); await (await import('mongoose')).default.disconnect(); process.exit(1); });
