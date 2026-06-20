import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Attendance from './pages/Attendance.jsx';
import WorkLogs from './pages/WorkLogs.jsx';
import Leave from './pages/Leave.jsx';
import Approvals from './pages/Approvals.jsx';
import Team from './pages/Team.jsx';

// Gate that also enforces role on the client (the server enforces it regardless).
function Protected({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-page muted">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
      <Route path="/work-logs" element={<Protected><WorkLogs /></Protected>} />
      <Route path="/leave" element={<Protected><Leave /></Protected>} />
      <Route path="/approvals" element={<Protected roles={['manager', 'admin']}><Approvals /></Protected>} />
      <Route path="/team" element={<Protected roles={['manager', 'admin']}><Team /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
