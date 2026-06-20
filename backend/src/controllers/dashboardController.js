import Attendance from '../models/Attendance.js';
import WorkLog from '../models/WorkLog.js';
import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';
import { todayKey, weekStartKey, addDaysKey } from '../utils/time.js';
import { round2 } from '../utils/hours.js';
import { accessibleUserIds, assertCanAccessUser } from '../utils/scope.js';
import { asyncHandler } from '../utils/ApiError.js';

// Builds the [weekStart, weekEnd] window (Mon..Sun) for an optional anchor day.
function weekWindow(anchor) {
  const start = weekStartKey(anchor || todayKey());
  const end = addDaysKey(start, 6);
  return { start, end };
}

// Rolls a single user's week of raw entries into a summary object.
async function summarizeUserWeek(userId, start, end, targetHours) {
  const [attendance, logs] = await Promise.all([
    Attendance.find({ user: userId, day: { $gte: start, $lte: end } }).lean(),
    WorkLog.find({ user: userId, day: { $gte: start, $lte: end } }).lean(),
  ]);

  const daysPresent = attendance.filter((a) =>
    ['present', 'wfh'].includes(a.status) && a.checkIn
  ).length;
  const attendanceHours = round2(attendance.reduce((s, a) => s + (a.hoursWorked || 0), 0));
  const lateCount = attendance.filter((a) => a.late).length;
  const missingCheckouts = attendance.filter((a) => a.missingCheckout).length;

  const loggedHours = round2(logs.reduce((s, l) => s + (l.hoursSpent || 0), 0));
  const byStatus = { in_progress: 0, done: 0, blocked: 0 };
  for (const l of logs) byStatus[l.status] = (byStatus[l.status] || 0) + 1;

  // Weekly target = 5 standard working days × daily target.
  const weeklyTarget = round2((targetHours || 8) * 5);
  const onTrack = loggedHours >= weeklyTarget * 0.9; // within 10% counts as on track

  return {
    week: { start, end },
    daysPresent,
    attendanceHours,
    loggedHours,
    weeklyTarget,
    onTrack,
    underLogging: loggedHours < weeklyTarget * 0.75,
    lateCount,
    missingCheckouts,
    tasks: { total: logs.length, ...byStatus },
  };
}

// GET /api/dashboard/me?week=&user= — weekly summary for the current user
// (or another user the actor may access).
export const myWeek = asyncHandler(async (req, res) => {
  const { week, user } = req.validatedQuery;
  let targetUser = req.user;
  if (user && String(user) !== String(req.user._id)) {
    await assertCanAccessUser(req.user, user);
    targetUser = await User.findById(user);
  }
  const { start, end } = weekWindow(week);
  const summary = await summarizeUserWeek(targetUser._id, start, end, targetUser.dailyTargetHours);

  // Leave taken (approved) overlapping the week.
  const leaves = await LeaveRequest.find({
    user: targetUser._id,
    status: 'approved',
    startDay: { $lte: end },
    endDay: { $gte: start },
  }).lean();

  res.json({
    user: { id: targetUser._id, name: targetUser.name, leaveBalance: targetUser.leaveBalance },
    summary,
    leavesThisWeek: leaves,
  });
});

// GET /api/dashboard/team?week= — manager/admin rollup over the accessible team(s).
export const teamWeek = asyncHandler(async (req, res) => {
  const { week } = req.validatedQuery;
  const { start, end } = weekWindow(week);
  const today = todayKey();

  const ids = await accessibleUserIds(req.user); // null = admin (everyone)
  const userFilter = ids === null ? { active: true } : { _id: { $in: ids } };
  const members = await User.find(userFilter)
    .select('name email role team dailyTargetHours leaveBalance')
    .populate('team', 'name')
    .lean();
  const memberIds = members.map((m) => m._id);

  // Present today (checked in, present/wfh).
  const presentToday = await Attendance.find({
    user: { $in: memberIds },
    day: today,
    status: { $in: ['present', 'wfh'] },
    checkIn: { $ne: null },
  })
    .select('user status late')
    .lean();
  const presentSet = new Set(presentToday.map((a) => String(a.user)));

  // Pending approvals in scope (managers exclude their own).
  const pendingFilter = { user: { $in: memberIds }, status: 'pending' };
  if (req.user.role === 'manager') pendingFilter.user = { $in: memberIds, $ne: req.user._id };
  const pendingCount = await LeaveRequest.countDocuments(pendingFilter);

  // Per-member weekly rollup (sequential-ish but bounded by team size).
  const perMember = await Promise.all(
    members.map(async (m) => {
      const s = await summarizeUserWeek(m._id, start, end, m.dailyTargetHours);
      return {
        id: m._id,
        name: m.name,
        email: m.email,
        role: m.role,
        team: m.team?.name || null,
        presentToday: presentSet.has(String(m._id)),
        leaveBalance: m.leaveBalance,
        ...s,
      };
    })
  );

  const teamHours = round2(perMember.reduce((sum, m) => sum + m.attendanceHours, 0));
  const teamLoggedHours = round2(perMember.reduce((sum, m) => sum + m.loggedHours, 0));
  const underLoggers = perMember.filter((m) => m.underLogging).map((m) => ({
    id: m.id, name: m.name, loggedHours: m.loggedHours, weeklyTarget: m.weeklyTarget,
  }));
  const blockedTasksTotal = perMember.reduce((sum, m) => sum + (m.tasks.blocked || 0), 0);

  res.json({
    week: { start, end },
    headcount: members.length,
    presentTodayCount: presentSet.size,
    pendingApprovals: pendingCount,
    teamAttendanceHours: teamHours,
    teamLoggedHours,
    attendancePctToday: members.length
      ? round2((presentSet.size / members.length) * 100)
      : 0,
    underLoggers,
    blockedTasksTotal,
    members: perMember,
  });
});

// GET /api/dashboard/blocked — blocked work logs in scope (manager/admin focus list).
export const blockedTasks = asyncHandler(async (req, res) => {
  const ids = await accessibleUserIds(req.user);
  const filter = { status: 'blocked' };
  if (ids !== null) filter.user = { $in: ids };
  const logs = await WorkLog.find(filter)
    .populate('user', 'name email')
    .sort({ day: -1 })
    .limit(100)
    .lean();
  res.json({ blocked: logs });
});
