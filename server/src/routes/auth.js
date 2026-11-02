import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { normalisePhone } from '../utils/phone.js';
import { issueSession, clearSession, requireAuth } from '../middleware/auth.js';

const router = Router();
const pendingOtps = new Map();
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(100) });

router.post('/otp/request', async (req, res) => {
  const { phone } = z.object({ phone: z.string().min(8).max(20) }).parse(req.body);
  const normalised = normalisePhone(phone);
  const demoOtpAllowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true';
  if (!demoOtpAllowed) return res.status(503).json({ error: 'A verified OTP provider must be configured before production sign-in is enabled.' });
  const code = process.env.OTP_DEV_CODE || '246810';
  pendingOtps.set(normalised, { code, expiresAt: Date.now() + 5 * 60_000, attempts: 0 });
  // Outbound OTP is intentionally mocked; only development exposes the code.
  res.json({ message: 'Demo OTP generated. No SMS was sent.', ...((process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_OTP === 'true') ? { demoCode: code } : {}) });
});

router.post('/otp/verify', async (req, res) => {
  const body = z.object({ phone: z.string().min(8).max(20), code: z.string().length(6) }).parse(req.body);
  const phone = normalisePhone(body.phone);
  const pending = pendingOtps.get(phone);
  if (!pending || pending.expiresAt < Date.now() || pending.attempts >= 5) return res.status(401).json({ error: 'OTP expired. Request a new one.' });
  pending.attempts += 1;
  if (pending.code !== body.code) return res.status(401).json({ error: 'That OTP is not correct.' });
  pendingOtps.delete(phone);
  const user = await User.findOneAndUpdate(
    { phone },
    { $setOnInsert: { phone, name: 'Demo buyer', role: 'buyer' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  if (user.role !== 'buyer' || !user.active) return res.status(403).json({ error: 'This number is not registered as a buyer.' });
  issueSession(res, user);
  res.json({ user: { id: user._id, name: user.name, role: user.role, phone: user.phone } });
});

router.post('/login', async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  issueSession(res, user);
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isAdmin: user.isAdmin } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user._id, name: req.user.name, email: req.user.email, phone: req.user.phone, role: req.user.role, isAdmin: req.user.isAdmin } });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ message: 'Signed out.' });
});

export default router;
