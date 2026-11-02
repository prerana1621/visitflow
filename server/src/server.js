import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { connectDatabase } from './config/db.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import leadRoutes from './routes/leads.js';
import chatRoutes from './routes/chat.js';
import bookingRoutes from './routes/bookings.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import { processDueReminders } from './services/reminders.js';
import { notFound, errorHandler } from './middleware/errors.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/chat', rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'visitflow-api', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must be set to a random value of at least 32 characters.');
    process.exit(1);
  }
  connectDatabase().then(() => {
    app.listen(port, () => console.log(`VisitFlow API listening on :${port}`));
    cron.schedule('* * * * *', async () => {
      try { await processDueReminders(); } catch (error) { console.error('[reminder-job]', error.message); }
    }, { timezone: process.env.REMINDER_TIMEZONE || 'Asia/Kolkata' });
  }).catch((error) => { console.error('Database connection failed:', error.message); process.exit(1); });
}

export default app;
