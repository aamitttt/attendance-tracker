import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { weekQuerySchema } from '../utils/validators.js';
import { myWeek, teamWeek, blockedTasks } from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate);

router.get('/me', validate(weekQuerySchema, 'query'), myWeek);
router.get('/team', requireRole('manager', 'admin'), validate(weekQuerySchema, 'query'), teamWeek);
router.get('/blocked', requireRole('manager', 'admin'), blockedTasks);

export default router;
