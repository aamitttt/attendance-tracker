import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import {
  leaveApplySchema,
  leaveDecisionSchema,
  leaveQuerySchema,
} from '../utils/validators.js';
import {
  applyLeave,
  listLeave,
  pendingLeave,
  decideLeave,
  cancelLeave,
} from '../controllers/leaveController.js';

const router = Router();
router.use(authenticate);

router.post('/', validate(leaveApplySchema), applyLeave);
router.get('/', validate(leaveQuerySchema, 'query'), listLeave);
router.get('/pending', requireRole('manager', 'admin'), pendingLeave);
router.patch(
  '/:id/decision',
  requireRole('manager', 'admin'),
  validate(leaveDecisionSchema),
  decideLeave
);
router.patch('/:id/cancel', cancelLeave);

export default router;
