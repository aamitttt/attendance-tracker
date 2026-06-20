import User from '../models/User.js';
import Team from '../models/Team.js';
import { accessibleUserIds } from '../utils/scope.js';
import { asyncHandler, badRequest, conflict, notFound } from '../utils/ApiError.js';

// GET /api/users — list users the actor may see (for filter dropdowns & admin management).
// employee → just themselves; manager → their team; admin → everyone.
export const listUsers = asyncHandler(async (req, res) => {
  const ids = await accessibleUserIds(req.user);
  const filter = ids === null ? {} : { _id: { $in: ids } };
  const users = await User.find(filter).populate('team', 'name').sort('name').lean();
  res.json({ users });
});

// POST /api/users — admin creates a user with an explicit role/team. (admin only)
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, team } = req.body;
  if (await User.findOne({ email })) throw conflict('Email already registered');

  if (team) {
    const exists = await Team.findById(team);
    if (!exists) throw badRequest('Team does not exist');
  }

  const user = new User({ name, email, role: role || 'employee', team: team || null });
  await user.setPassword(password);
  await user.save();
  res.status(201).json({ user });
});

// GET /api/teams — list teams (admin: all, manager: their own).
export const listTeams = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { _id: req.user.team };
  const teams = await Team.find(filter).populate('manager', 'name email').sort('name').lean();
  res.json({ teams });
});

// POST /api/teams — admin creates a team. (admin only)
export const createTeam = asyncHandler(async (req, res) => {
  const { name, manager, description } = req.body;
  if (!name) throw badRequest('Team name is required');
  if (await Team.findOne({ name })) throw conflict('Team name already exists');

  if (manager) {
    const m = await User.findById(manager);
    if (!m) throw notFound('Manager user not found');
  }
  const team = await Team.create({ name, manager: manager || null, description });
  res.status(201).json({ team });
});
