import User from '../models/User.js';
import { forbidden } from './ApiError.js';

// ── The single source of truth for "whose rows can this actor see?" ──────────────
// Every data endpoint (attendance, work logs, leave, dashboards) derives its query
// filter from here, so access control is enforced server-side in one place and can
// never be bypassed by hiding things in the UI.
//
//   employee → only their own user id
//   manager  → every member of their team (themselves included)
//   admin/HR → everyone (no restriction)

// Returns the list of user ids the actor may read, or null meaning "no restriction".
export async function accessibleUserIds(actor) {
  if (actor.role === 'admin') return null; // unrestricted
  if (actor.role === 'manager') {
    if (!actor.team) return [actor._id]; // manager without a team sees only themselves
    const members = await User.find({ team: actor.team }).select('_id').lean();
    const ids = members.map((m) => m._id);
    // Ensure the manager is always included even if not formally a team member row.
    if (!ids.some((id) => String(id) === String(actor._id))) ids.push(actor._id);
    return ids;
  }
  // employee
  return [actor._id];
}

// Builds a Mongo filter fragment restricting a `user` field to the accessible set.
// Returns {} for admins (no restriction).
export async function userScopeFilter(actor, field = 'user') {
  const ids = await accessibleUserIds(actor);
  if (ids === null) return {};
  return { [field]: { $in: ids } };
}

// Throws 403 unless the actor may access the target user's data.
export async function assertCanAccessUser(actor, targetUserId) {
  if (actor.role === 'admin') return;
  if (String(actor._id) === String(targetUserId)) return;
  if (actor.role === 'manager') {
    const ids = await accessibleUserIds(actor);
    if (ids.some((id) => String(id) === String(targetUserId))) return;
  }
  throw forbidden('You cannot access this user\'s data');
}

// Throws 403 unless the actor may *write* (create/update/delete) the target's data.
// Work logs & attendance are owner-only writes; admins may act on anyone.
export function assertCanWriteFor(actor, targetUserId) {
  if (actor.role === 'admin') return;
  if (String(actor._id) === String(targetUserId)) return;
  throw forbidden('You can only modify your own records');
}
