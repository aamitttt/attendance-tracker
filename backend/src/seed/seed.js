import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Team from '../models/Team.js';
import Attendance from '../models/Attendance.js';
import WorkLog from '../models/WorkLog.js';
import LeaveRequest from '../models/LeaveRequest.js';
import { dayKey, addDaysKey, inclusiveDayCount } from '../utils/time.js';
import { isLate, computeHours } from '../utils/hours.js';

const PASSWORD = 'Password123';

// Deterministic-ish pseudo random so reseeding looks similar but varied.
let seedState = 42;
function rnd() {
  seedState = (seedState * 1103515245 + 12345) & 0x7fffffff;
  return seedState / 0x7fffffff;
}
function pick(arr) {
  return arr[Math.floor(rnd() * arr.length)];
}

const PROJECTS = ['Apollo', 'Helios', 'Atlas', 'Orion', 'Nimbus'];
const TASK_TITLES = [
  'Implement API endpoint',
  'Fix production bug',
  'Write unit tests',
  'Code review',
  'Design data model',
  'Update documentation',
  'Refactor service layer',
  'Investigate flaky test',
  'Build dashboard widget',
  'Pair on integration',
];
const STATUSES = ['in_progress', 'done', 'done', 'done', 'blocked']; // weighted toward done

async function makeUser({ name, email, role, team, leaveBalance = 20 }) {
  const u = new User({ name, email, role, team, leaveBalance });
  await u.setPassword(PASSWORD);
  await u.save();
  return u;
}

// Build the last N weekdays (skip Sat/Sun), oldest first, ending today.
function lastWeekdays(n) {
  const days = [];
  let cursor = dayKey(new Date());
  let guard = 0;
  while (days.length < n && guard < n * 3) {
    const d = new Date(`${cursor}T00:00:00.000Z`);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days.unshift(cursor);
    cursor = addDaysKey(cursor, -1);
    guard += 1;
  }
  return days;
}

async function run() {
  await connectDB(env.mongoUri);
  console.log('[seed] clearing collections…');
  await Promise.all([
    User.deleteMany({}),
    Team.deleteMany({}),
    Attendance.deleteMany({}),
    WorkLog.deleteMany({}),
    LeaveRequest.deleteMany({}),
  ]);

  // ── Teams ────────────────────────────────────────────────────────────────
  const engineering = await Team.create({ name: 'Engineering', description: 'Builds the product' });
  const design = await Team.create({ name: 'Design', description: 'Owns UX & visuals' });
  const sales = await Team.create({ name: 'Sales', description: 'Revenue & accounts' });

  // ── Admin / HR (no team — sees everything) ─────────────────────────────────
  const admin = await makeUser({
    name: 'Arjun Singh', email: 'admin@acme.test', role: 'admin', team: null, leaveBalance: 30,
  });

  // ── Managers (one per team) ────────────────────────────────────────────────
  const engManager = await makeUser({
    name: 'Amit', email: 'maya@acme.test', role: 'manager', team: engineering._id,
  });
  const desManager = await makeUser({
    name: 'Dev Designlead', email: 'dev@acme.test', role: 'manager', team: design._id,
  });
  const salManager = await makeUser({
    name: 'Sam Saleshead', email: 'sam@acme.test', role: 'manager', team: sales._id,
  });

  engineering.manager = engManager._id;
  design.manager = desManager._id;
  sales.manager = salManager._id;
  await Promise.all([engineering.save(), design.save(), sales.save()]);

  // ── Employees ──────────────────────────────────────────────────────────────
  const employees = await Promise.all([
    makeUser({ name: 'Sunil', email: 'eli@acme.test', role: 'employee', team: engineering._id }),
    makeUser({ name: 'Nora Node', email: 'nora@acme.test', role: 'employee', team: engineering._id }),
    makeUser({ name: 'Raj React', email: 'raj@acme.test', role: 'employee', team: engineering._id }),
    makeUser({ name: 'Pia Pixel', email: 'pia@acme.test', role: 'employee', team: design._id }),
    makeUser({ name: 'Theo Type', email: 'theo@acme.test', role: 'employee', team: design._id }),
    makeUser({ name: 'Cleo Close', email: 'cleo@acme.test', role: 'employee', team: sales._id }),
  ]);

  // Everyone who logs attendance/work: managers + employees (not the admin).
  const workers = [engManager, desManager, salManager, ...employees];

  const days = lastWeekdays(10); // ~2 working weeks
  console.log(`[seed] generating attendance + logs for ${workers.length} users across ${days.length} days…`);

  const attendanceDocs = [];
  const workLogDocs = [];

  for (const user of workers) {
    for (const day of days) {
      const roll = rnd();
      // ~8% of days are off / on leave (no attendance row), rest present/wfh.
      if (roll < 0.08) continue;

      const wfh = rnd() < 0.25;
      // Check-in between 08:30 and 10:15 to produce a mix of on-time / late.
      const inHour = 8 + Math.floor(rnd() * 2); // 8 or 9
      const inMin = Math.floor(rnd() * 60);
      const checkIn = new Date(`${day}T${String(inHour).padStart(2, '0')}:${String(inMin).padStart(2, '0')}:00.000Z`);

      // ~10% forget to check out.
      const forgot = rnd() < 0.1;
      let checkOut = null;
      if (!forgot) {
        const workedMs = (7.5 + rnd() * 2.5) * 3600000; // 7.5–10h
        checkOut = new Date(checkIn.getTime() + workedMs);
      }

      const { hoursWorked, missingCheckout } = computeHours(checkIn, checkOut);
      attendanceDocs.push({
        user: user._id,
        day,
        checkIn,
        checkOut,
        status: wfh ? 'wfh' : 'present',
        hoursWorked,
        late: isLate(checkIn),
        missingCheckout,
      });

      // 1–3 work logs per worked day.
      const nLogs = 1 + Math.floor(rnd() * 3);
      let remaining = hoursWorked || 8;
      for (let i = 0; i < nLogs; i += 1) {
        const h = i === nLogs - 1 ? Math.max(0.5, remaining) : Math.min(remaining, 1 + rnd() * 3);
        remaining = Math.max(0, remaining - h);
        workLogDocs.push({
          user: user._id,
          day,
          title: pick(TASK_TITLES),
          description: 'Auto-generated seed task.',
          project: pick(PROJECTS),
          hoursSpent: Math.round(h * 10) / 10,
          status: pick(STATUSES),
        });
      }
    }
  }

  await Attendance.insertMany(attendanceDocs);
  await WorkLog.insertMany(workLogDocs);
  console.log(`[seed] inserted ${attendanceDocs.length} attendance + ${workLogDocs.length} work logs`);

  // ── Leave requests (mix of states) ─────────────────────────────────────────
  const today = dayKey(new Date());
  const future = (n) => addDaysKey(today, n);

  const leaveSpecs = [
    { user: employees[0], type: 'casual', start: future(3), end: future(4), status: 'pending', reason: 'Family event' },
    { user: employees[1], type: 'sick', start: future(1), end: future(1), status: 'approved', reason: 'Doctor visit', approver: engManager },
    { user: employees[2], type: 'earned', start: future(7), end: future(9), status: 'pending', reason: 'Short trip' },
    { user: employees[3], type: 'casual', start: future(2), end: future(2), status: 'rejected', reason: 'Personal', approver: desManager, note: 'Sprint deadline' },
    { user: employees[4], type: 'unpaid', start: future(10), end: future(12), status: 'pending', reason: 'Extended travel' },
    { user: employees[5], type: 'sick', start: future(5), end: future(6), status: 'approved', reason: 'Recovery', approver: salManager },
  ];

  for (const spec of leaveSpecs) {
    const days = inclusiveDayCount(spec.start, spec.end);
    const drawsBalance = spec.type !== 'unpaid';
    const doc = {
      user: spec.user._id,
      type: spec.type,
      startDay: spec.start,
      endDay: spec.end,
      days,
      reason: spec.reason,
      status: spec.status,
    };
    if (spec.status === 'approved' || spec.status === 'rejected') {
      doc.approver = spec.approver._id;
      doc.decidedAt = new Date();
      doc.decisionNote = spec.note || '';
    }
    await LeaveRequest.create(doc);
    // Debit balance for approved, balance-bearing leave (mirrors the approval logic).
    if (spec.status === 'approved' && drawsBalance) {
      await User.findByIdAndUpdate(spec.user._id, { $inc: { leaveBalance: -days } });
    }
  }
  console.log(`[seed] inserted ${leaveSpecs.length} leave requests`);

  console.log('\n──────── Seed complete. Login with password "%s" ────────', PASSWORD);
  console.table([
    { role: 'admin', email: admin.email },
    { role: 'manager (Engineering)', email: engManager.email },
    { role: 'manager (Design)', email: desManager.email },
    { role: 'manager (Sales)', email: salManager.email },
    ...employees.map((e) => ({ role: 'employee', email: e.email })),
  ]);

  await disconnectDB();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
