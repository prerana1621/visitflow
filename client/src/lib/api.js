export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload.details;
    throw error;
  }
  return payload;
}

export function formatDate(value, opts = {}) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', ...opts }).format(new Date(value));
}

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return 'Not confirmed';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}
