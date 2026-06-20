import User from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { unauthorized } from '../utils/ApiError.js';

// Authenticates the request from a Bearer token and attaches the live user document.
// We re-load the user (rather than trusting the token body) so role/team changes and
// deactivations take effect immediately.
export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw unauthorized('Missing or malformed Authorization header');
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw unauthorized('Invalid or expired token');
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw unauthorized('User no longer active');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
