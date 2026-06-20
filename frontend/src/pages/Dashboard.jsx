import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Stat, StatusBadge, ErrorText } from '../components/ui.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/dashboard/me')
      .then(setData)
      .catch(setError);
  }, []);

  if (error) return <ErrorText error={error} />;
  if (!data) return <p className="muted">Loading…</p>;

  const s = data.summary;
  return (
    <div>
      <h2>My Week</h2>
      <p className="muted">
        {s.week.start} → {s.week.end} · leave balance <strong>{data.user.leaveBalance}</strong> days
      </p>

      <div className="grid cols-4">
        <Stat value={s.daysPresent} label="Days present" />
        <Stat value={`${s.attendanceHours}h`} label="Hours at work" />
        <Stat value={`${s.loggedHours}h`} label={`Logged / ${s.weeklyTarget}h target`}
          color={s.underLogging ? 'var(--red)' : undefined} />
        <Stat value={s.lateCount} label="Late check-ins"
          color={s.lateCount ? 'var(--amber)' : undefined} />
      </div>

      <div className="card">
        <div className="flex-between">
          <h3 style={{ margin: 0 }}>On track?</h3>
          <StatusBadge value={s.onTrack ? 'approved' : 'pending'} />
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {s.onTrack
            ? `You've logged ${s.loggedHours}h toward your ${s.weeklyTarget}h weekly target.`
            : `You're at ${s.loggedHours}h of a ${s.weeklyTarget}h target — keep logging your work.`}
          {s.missingCheckouts > 0 && ` · ${s.missingCheckouts} day(s) had a missing check-out (auto-capped).`}
        </p>
      </div>

      <div className="grid cols-3">
        <Stat value={s.tasks.in_progress} label="Tasks in progress" />
        <Stat value={s.tasks.done} label="Tasks done" color="var(--green)" />
        <Stat value={s.tasks.blocked} label="Tasks blocked"
          color={s.tasks.blocked ? 'var(--red)' : undefined} />
      </div>

      {data.leavesThisWeek.length > 0 && (
        <div className="card">
          <h3>Approved leave this week</h3>
          {data.leavesThisWeek.map((l) => (
            <div key={l._id} className="pill-row" style={{ marginBottom: 6 }}>
              <StatusBadge value={l.type} />
              <span className="muted">{l.startDay} → {l.endDay} ({l.days}d)</span>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ fontSize: 13 }}>
        Signed in as {user.email} ({user.role}).
      </p>
    </div>
  );
}
