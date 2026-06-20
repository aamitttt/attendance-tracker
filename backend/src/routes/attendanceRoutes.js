import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { checkInSchema, checkOutSchema } from '../utils/validators.js';
import { z } from 'zod';
import {
  checkIn,
  checkOut,
  today,
  listAttendance,
  runCloseStale,
} from '../controllers/attendanceController.js';

const listQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  user: z.string().optional(),
});

const router = Router();
router.use(authenticate);

router.post('/check-in', validate(checkInSchema), checkIn);
router.post('/check-out', validate(checkOutSchema), checkOut);
router.get('/today', today);
router.get('/', validate(listQuerySchema, 'query'), listAttendance);
router.post('/close-stale', requireRole('admin'), runCloseStale);

export default router;
