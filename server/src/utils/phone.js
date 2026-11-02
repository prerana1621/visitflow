const DEMO_BUYER_PHONE = '0000000001';

function validNationalNumber(digits) {
  return digits === DEMO_BUYER_PHONE || /^[6-9]\d{9}$/.test(digits);
}

export function normalisePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10 && validNationalNumber(digits)) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91') && validNationalNumber(digits.slice(2))) return `+${digits}`;
  throw new Error('Enter a valid 10-digit Indian mobile number.');
}

export function isValidPhone(value) {
  try { normalisePhone(value); return true; } catch { return false; }
}
