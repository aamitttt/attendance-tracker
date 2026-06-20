import { env } from '../config/env.js';

const HOUR_MS = 3600000;

// A check-in is "late" if its local wall-clock time is at/after the configured threshold.
export function isLate(checkIn, {
  hour = env.lateThresholdHour,
  minute = env.lateThresholdMinute,
} = {}) {
  const h = checkIn.getHours();
  const m = checkIn.getMinutes();
  return h > hour || (h === hour && m >= minute);
}

// Compute hours worked between check-in and check-out.
// - Normal case: rounded difference in hours.
// - Missing check-out: caller passes checkOut = null; we cap the day at STANDARD_DAY_HOURS
//   so a forgotten checkout never inflates totals, and flag it.
export function computeHours(checkIn, checkOut, {
  standardDayHours = env.standardDayHours,
} = {}) {
  if (!checkIn) return { hoursWorked: 0, missingCheckout: false };

  if (!checkOut) {
    return { hoursWorked: round2(standardDayHours), missingCheckout: true };
  }

  let diff = (checkOut.getTime() - checkIn.getTime()) / HOUR_MS;
  if (diff < 0) diff = 0; // guard against clock weirdness / bad data
  // Cap absurdly long sessions (e.g. check-out next day) at the standard day length.
  if (diff > 24) diff = standardDayHours;
  return { hoursWorked: round2(diff), missingCheckout: false };
}

export function round2(n) {
  return Math.round(n * 100) / 100;
}
