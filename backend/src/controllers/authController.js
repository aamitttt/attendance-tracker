import User from '../models/User.js';
import { signToken } from '../utils/token.js';
import { asyncHandler, conflict, unauthorized } from '../utils/ApiError.js';

// POST /api/auth/signup — public self-registration (role forced to employee).
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw conflict('Email already registered');

  const user = new User({ name, email, role: 'employee' });
  await user.setPassword(password);
  await user.save();

  const token = signToken(user);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.active) throw unauthorized('Invalid credentials');

  const ok = await user.verifyPassword(password);
  if (!ok) throw unauthorized('Invalid credentials');

  const token = signToken(user);
  user.passwordHash = undefined;
  res.json({ token, user });
});

// GET /api/auth/me — current identity (used by the frontend on load).
export const me = asyncHandler(async (req, res) => {
  await req.user.populate('team', 'name');
  res.json({ user: req.user });
});
