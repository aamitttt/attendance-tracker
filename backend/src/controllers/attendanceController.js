import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { todayKey } from '../utils/time.js';
import { isLate, computeHours } from '../utils/hours.js';
import { userScopeFilter, assertCanAccessUser } from '../utils/scope.js';
import { asyncHandler, badRequest, conflict } from '../utils/ApiError.js';

// POST /api/attendance/check-in — start the day for the current user.
// Guards: one record per day (unique index), and not while on approved leave.
export const checkIn = asyncHandler(async (req, res) => {
  const day = todayKey();
  const now = new Date();

  const existing = await Attendance.findOne({ user: req.user._id, day });
  if (existing && existing.checkIn) {
    throw conflict('Already checked in today');
  }

  // Block check-in if the user has approved leave covering today.
  const onLeave = await LeaveRequest.findOne({
    user: req.user._id,
    status: 'approved',
    startDay: { $lte: day },
    endDay: { $gte: day },
  });
  if (onLeave) throw conflict('You are on approved leave today');

  const late = isLate(now);
  const status = req.body.status || 'present';

  const record = existing || new Attendance({ user: req.user._id, day });
  record.checkIn = now;
  record.status = status;
  record.late = late;
  record.notes = req.body.notes || record.notes;
  await record.save();

  res.status(201).json({ attendance: record });
});

// POST /api/attendance/check-out — close the day; compute hours.
export const checkOut = asyncHandler(async (req, res) => {
  const day = todayKey();
  const record = await Attendance.findOne({ user: req.user._id, day });
  if (!record || !record.checkIn) throw badRequest('You have not checked in today');
  if (record.checkOut) throw conflict('Already checked out today');

  const now = new Date();
  record.checkOut = now;
  const { hoursWorked, missingCheckout } = computeHours(record.checkIn, now);
  record.hoursWorked = hoursWorked;
  record.missingCheckout = missingCheckout;
  if (req.body.notes) record.notes = req.body.notes;
  await record.save();

  res.json({ attendance: record });
});

// GET /api/attendance/today — current user's status for today.
export const today = asyncHandler(async (req, res) => {
  const record = await Attendance.findOne({ user: req.user._id, day: todayKey() });
  res.json({ attendance: record });
});

// GET /api/attendance?from&to&user — scoped, ranged history.
export const listAttendance = asyncHandler(async (req, res) => {
  const { from, to, user } = req.validatedQuery;
  const filter = await userScopeFilter(req.user);

  if (user) {
    await assertCanAccessUser(req.user, user);
    filter.user = user;
  }
  if (from || to) {
    filter.day = {};
    if (from) filter.day.$gte = from;
    if (to) filter.day.$lte = to;
  }

  const records = await Attendance.find(filter)
    .populate('user', 'name email')
    .sort({ day: -1 })
    .lean();
  res.json({ attendance: records });
});

// Reconcile any past days where the user checked in but never out:
// cap hours at the standard day and flag them. Exposed for the seed + a maintenance route.
export async function closeStaleCheckouts(beforeDay = todayKey()) {
  const stale = await Attendance.find({
    day: { $lt: beforeDay },
    checkIn: { $ne: null },
    checkOut: null,
  });
  let closed = 0;
  for (const rec of stale) {
    const { hoursWorked, missingCheckout } = computeHours(rec.checkIn, null);
    rec.hoursWorked = hoursWorked;
    rec.missingCheckout = missingCheckout;
    await rec.save();
    closed += 1;
  }
  return closed;
}

// POST /api/attendance/close-stale — admin maintenance trigger.
export const runCloseStale = asyncHandler(async (_req, res) => {
  const closed = await closeStaleCheckouts();
  res.json({ closed });
});
