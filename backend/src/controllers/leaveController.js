import LeaveRequest from '../models/LeaveRequest.js';
import User from '../models/User.js';
import { withOptionalTransaction } from '../utils/tx.js';
import { todayKey, inclusiveDayCount } from '../utils/time.js';
import {
  userScopeFilter,
  assertCanAccessUser,
} from '../utils/scope.js';
import { asyncHandler, badRequest, conflict, notFound, forbidden } from '../utils/ApiError.js';

// POST /api/leave — apply for leave (current user).
// Enforces: no past dates, end >= start, no overlap with existing active leave,
// and (for balance-bearing types) not exceeding the remaining balance.
export const applyLeave = asyncHandler(async (req, res) => {
  const { type, startDay, endDay, reason } = req.body;
  const today = todayKey();

  if (startDay < today) throw badRequest('Leave cannot start in the past');
  if (endDay < startDay) throw badRequest('End date must be on or after start date');

  const days = inclusiveDayCount(startDay, endDay);

  // Overlap check against any pending/approved leave for this user.
  // Two inclusive ranges overlap iff start <= otherEnd AND otherStart <= end.
  const overlap = await LeaveRequest.findOne({
    user: req.user._id,
    status: { $in: ['pending', 'approved'] },
    startDay: { $lte: endDay },
    endDay: { $gte: startDay },
  });
  if (overlap) {
    throw conflict('Requested dates overlap an existing leave request', {
      conflictingId: overlap._id,
      conflictingRange: `${overlap.startDay}..${overlap.endDay}`,
    });
  }

  // Unpaid leave does not draw from the balance; others do.
  const drawsBalance = type !== 'unpaid';
  if (drawsBalance && days > req.user.leaveBalance) {
    throw badRequest(
      `Requested ${days} day(s) exceeds your balance of ${req.user.leaveBalance}`
    );
  }

  const leave = await LeaveRequest.create({
    user: req.user._id,
    type,
    startDay,
    endDay,
    days,
    reason: reason || '',
  });
  res.status(201).json({ leave });
});

// GET /api/leave — scoped list (own / team / all), filterable by status & user.
export const listLeave = asyncHandler(async (req, res) => {
  const { status, user, page, limit } = req.validatedQuery;
  const filter = await userScopeFilter(req.user);
  if (user) {
    await assertCanAccessUser(req.user, user);
    filter.user = user;
  }
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('user', 'name email leaveBalance')
      .populate('approver', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LeaveRequest.countDocuments(filter),
  ]);

  res.json({
    leaves: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

// GET /api/leave/pending — manager/admin queue of requests awaiting a decision.
export const pendingLeave = asyncHandler(async (req, res) => {
  const filter = await userScopeFilter(req.user);
  filter.status = 'pending';
  // A manager should not see (or approve) their own request in their queue.
  if (req.user.role === 'manager') filter.user = { ...filter.user, $ne: req.user._id };

  const leaves = await LeaveRequest.find(filter)
    .populate('user', 'name email leaveBalance')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ leaves });
});

// PATCH /api/leave/:id/decision — manager/admin approves or rejects.
// Balance is debited only on approval, inside a transaction with a re-check to avoid races.
export const decideLeave = asyncHandler(async (req, res) => {
  const { decision, decisionNote } = req.body;
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) throw notFound('Leave request not found');

  // Scope: the approver must be allowed to see this user, and cannot approve their own.
  await assertCanAccessUser(req.user, leave.user);
  if (String(leave.user) === String(req.user._id)) {
    throw forbidden('You cannot decide your own leave request');
  }
  if (leave.status !== 'pending') {
    throw conflict(`Request is already ${leave.status}`);
  }

  if (decision === 'rejected') {
    leave.status = 'rejected';
    leave.approver = req.user._id;
    leave.decidedAt = new Date();
    leave.decisionNote = decisionNote || '';
    await leave.save();
    return res.json({ leave });
  }

  // Approval path — debit balance atomically (skip for unpaid).
  const drawsBalance = leave.type !== 'unpaid';
  await withOptionalTransaction(async (session) => {
    if (drawsBalance) {
      // Conditional update guarantees we never push the balance negative even under
      // concurrent approvals.
      const updated = await User.findOneAndUpdate(
        { _id: leave.user, leaveBalance: { $gte: leave.days } },
        { $inc: { leaveBalance: -leave.days } },
        { new: true, session }
      );
      if (!updated) {
        throw conflict('Employee no longer has enough leave balance');
      }
    }
    leave.status = 'approved';
    leave.approver = req.user._id;
    leave.decidedAt = new Date();
    leave.decisionNote = decisionNote || '';
    await leave.save({ session });
  });

  res.json({ leave });
});

// PATCH /api/leave/:id/cancel — owner cancels their own request.
// If it was approved, the debited balance is restored.
export const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) throw notFound('Leave request not found');
  if (String(leave.user) !== String(req.user._id)) {
    throw forbidden('You can only cancel your own leave');
  }
  if (!['pending', 'approved'].includes(leave.status)) {
    throw conflict(`Cannot cancel a ${leave.status} request`);
  }

  const wasApproved = leave.status === 'approved';
  const drawsBalance = leave.type !== 'unpaid';

  await withOptionalTransaction(async (session) => {
    if (wasApproved && drawsBalance) {
      await User.findByIdAndUpdate(
        leave.user,
        { $inc: { leaveBalance: leave.days } },
        { session }
      );
    }
    leave.status = 'cancelled';
    await leave.save({ session });
  });

  res.json({ leave });
});
