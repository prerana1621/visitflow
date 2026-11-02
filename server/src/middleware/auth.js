import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 8 * 60 * 60 * 1000,
});

export function issueSession(res, user) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, isAdmin: Boolean(user.isAdmin) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
  res.cookie('vf_session', token, cookieOptions());
}

export function clearSession(res) {
  res.clearCookie('vf_session', { ...cookieOptions(), maxAge: 0 });
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.vf_session;
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select('name email phone role isAdmin active');
    if (!user || !user.active) return res.status(401).json({ error: 'Your session is no longer active.' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'You do not have permission to do that.' });
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin access is required.' });
  next();
};
