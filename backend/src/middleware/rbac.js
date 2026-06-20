import { forbidden } from '../utils/ApiError.js';

// Route guard: allow only the listed roles. Use after authenticate().
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(forbidden('Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
