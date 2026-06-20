import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validate } from '../middleware/validate.js';
import { signupSchema } from '../utils/validators.js';
import {
  listUsers,
  createUser,
  listTeams,
  createTeam,
} from '../controllers/userController.js';

const router = Router();
router.use(authenticate);

router.get('/users', listUsers);
router.post('/users', requireRole('admin'), validate(signupSchema), createUser);

router.get('/teams', listTeams);
router.post('/teams', requireRole('admin'), createTeam);

export default router;
