import { z } from 'zod';
import { ROLES } from '../models/User.js';
import { WORKLOG_STATUS } from '../models/WorkLog.js';
import { LEAVE_TYPES } from '../models/LeaveRequest.js';

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

export const signupSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  // Self-signup defaults to employee; admin-created users may set role/team.
  role: z.enum(ROLES).optional(),
  team: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const checkInSchema = z.object({
  status: z.enum(['present', 'wfh']).optional(),
  notes: z.string().max(500).optional(),
});

export const checkOutSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const workLogCreateSchema = z.object({
  day: dayKey.optional(), // defaults to today
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  project: z.string().min(1).max(120),
  hoursSpent: z.number().min(0).max(24),
  status: z.enum(WORKLOG_STATUS).optional(),
});

export const workLogUpdateSchema = workLogCreateSchema.partial();

export const workLogQuerySchema = z.object({
  from: dayKey.optional(),
  to: dayKey.optional(),
  project: z.string().optional(),
  status: z.enum(WORKLOG_STATUS).optional(),
  user: z.string().optional(), // managers/admins may scope to an employee
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const leaveApplySchema = z.object({
  type: z.enum(LEAVE_TYPES),
  startDay: dayKey,
  endDay: dayKey,
  reason: z.string().max(1000).optional(),
});

export const leaveDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  decisionNote: z.string().max(1000).optional(),
});

export const leaveQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  user: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const weekQuerySchema = z.object({
  week: dayKey.optional(), // any day within the target week; defaults to current week
  user: z.string().optional(),
});
