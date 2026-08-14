export function toDate(value) {
  return value ? new Date(value) : null;
}

export function toIsoDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const [h, m, s] = value.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, s || 0, 0);
  return d;
}

export function toIsoTime(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
