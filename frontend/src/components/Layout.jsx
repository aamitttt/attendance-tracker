import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Role-driven navigation. The UI hides links the role can't use, but the server
// still enforces access independently (defense in depth) — hiding is convenience only.
export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const isManagerOrAdmin = user.role === 'manager' || user.role === 'admin';

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>⏱ Attendance</h1>
        <div className="role">{user.name} · {user.role}</div>
        <NavLink to="/" end className="nav-link">Dashboard</NavLink>
        <NavLink to="/attendance" className="nav-link">Attendance</NavLink>
        <NavLink to="/work-logs" className="nav-link">Work Logs</NavLink>
        <NavLink to="/leave" className="nav-link">My Leave</NavLink>
        {isManagerOrAdmin && (
          <NavLink to="/approvals" className="nav-link">Approvals</NavLink>
        )}
        {isManagerOrAdmin && (
          <NavLink to="/team" className="nav-link">Team</NavLink>
        )}
        <div className="spacer" />
        <button className="ghost" onClick={logout}>Log out</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
