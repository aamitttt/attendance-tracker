// All day-keys are UTC "YYYY-MM-DD" strings so comparisons are simple lexicographic ops
// and free of timezone drift. Times (check-in/out) remain full Date instants.

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function todayKey() {
  return dayKey(new Date());
}

// Parse a "YYYY-MM-DD" key into a UTC Date at midnight. Throws on malformed input.
export function parseDay(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    throw new Error(`Invalid day key: ${key}`);
  }
  const d = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid day key: ${key}`);
  return d;
}

// Inclusive list of day-keys from start to end. Returns [] if end < start.
export function enumerateDays(startKey, endKey) {
  const start = parseDay(startKey);
  const end = parseDay(endKey);
  const out = [];
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    out.push(dayKey(new Date(t)));
  }
  return out;
}

// Inclusive count of calendar days in [startKey, endKey].
export function inclusiveDayCount(startKey, endKey) {
  return enumerateDays(startKey, endKey).length;
}

// Two inclusive day ranges overlap if each starts on or before the other ends.
export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}

// Start of the ISO week (Monday) containing the given key, as a day-key.
export function weekStartKey(key) {
  const d = parseDay(key);
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? 6 : dow - 1; // days since Monday
  return dayKey(new Date(d.getTime() - diff * 86400000));
}

export function addDaysKey(key, n) {
  return dayKey(new Date(parseDay(key).getTime() + n * 86400000));
}
