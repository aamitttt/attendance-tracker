import WorkLog from '../models/WorkLog.js';
import { todayKey } from '../utils/time.js';
import {
  userScopeFilter,
  assertCanAccessUser,
  assertCanWriteFor,
} from '../utils/scope.js';
import { asyncHandler, notFound } from '../utils/ApiError.js';

// POST /api/work-logs — create a log owned by the current user.
export const createWorkLog = asyncHandler(async (req, res) => {
  const { day, title, description, project, hoursSpent, status } = req.body;
  const log = await WorkLog.create({
    user: req.user._id,
    day: day || todayKey(),
    title,
    description: description || '',
    project,
    hoursSpent,
    status: status || 'in_progress',
  });
  res.status(201).json({ workLog: log });
});

// GET /api/work-logs — scoped, filtered, paginated.
// Filters: from, to (date range), project, status, user (manager/admin only).
export const listWorkLogs = asyncHandler(async (req, res) => {
  const { from, to, project, status, user, page, limit } = req.validatedQuery;

  const filter = await userScopeFilter(req.user);
  if (user) {
    await assertCanAccessUser(req.user, user); // 403 if outside the actor's scope
    filter.user = user;
  }
  if (project) filter.project = project;
  if (status) filter.status = status;
  if (from || to) {
    filter.day = {};
    if (from) filter.day.$gte = from;
    if (to) filter.day.$lte = to;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    WorkLog.find(filter)
      .populate('user', 'name email')
      .sort({ day: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WorkLog.countDocuments(filter),
  ]);

  res.json({
    workLogs: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  });
});

// GET /api/work-logs/:id — single log (scoped).
export const getWorkLog = asyncHandler(async (req, res) => {
  const log = await WorkLog.findById(req.params.id).populate('user', 'name email');
  if (!log) throw notFound('Work log not found');
  await assertCanAccessUser(req.user, log.user._id);
  res.json({ workLog: log });
});

// PATCH /api/work-logs/:id — owner-only edit (admins may edit anyone).
export const updateWorkLog = asyncHandler(async (req, res) => {
  const log = await WorkLog.findById(req.params.id);
  if (!log) throw notFound('Work log not found');
  assertCanWriteFor(req.user, log.user); // owner or admin only

  const fields = ['day', 'title', 'description', 'project', 'hoursSpent', 'status'];
  for (const f of fields) {
    if (req.body[f] !== undefined) log[f] = req.body[f];
  }
  await log.save();
  res.json({ workLog: log });
});

// DELETE /api/work-logs/:id — owner-only delete (admins may delete anyone).
export const deleteWorkLog = asyncHandler(async (req, res) => {
  const log = await WorkLog.findById(req.params.id);
  if (!log) throw notFound('Work log not found');
  assertCanWriteFor(req.user, log.user);
  await log.deleteOne();
  res.status(204).end();
});
