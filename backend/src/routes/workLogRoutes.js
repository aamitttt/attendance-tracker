import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  workLogCreateSchema,
  workLogUpdateSchema,
  workLogQuerySchema,
} from '../utils/validators.js';
import {
  createWorkLog,
  listWorkLogs,
  getWorkLog,
  updateWorkLog,
  deleteWorkLog,
} from '../controllers/workLogController.js';

const router = Router();
router.use(authenticate);

router.post('/', validate(workLogCreateSchema), createWorkLog);
router.get('/', validate(workLogQuerySchema, 'query'), listWorkLogs);
router.get('/:id', getWorkLog);
router.patch('/:id', validate(workLogUpdateSchema), updateWorkLog);
router.delete('/:id', deleteWorkLog);

export default router;
