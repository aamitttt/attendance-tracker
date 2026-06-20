import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Stat, StatusBadge, ErrorText } from '../components/ui.jsx';

export default function Team() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/dashboard/team').then(setData).catch(setError);
  }, []);

  if (error) return <ErrorText error={error} />;
  if (!data) return <p className="muted">Loading…</p>;

  return (
    <div>
      <h2>Team Dashboard</h2>
      <p className="muted">Week {data.week.start} → {data.week.end} · {data.headcount} people</p>

      <div className="grid cols-4">
        <Stat value={`${data.presentTodayCount}/${data.headcount}`} label="Present today" />
        <Stat value={`${data.attendancePctToday}%`} label="Attendance today" />
        <Stat value={data.pendingApprovals} label="Pending approvals"
          color={data.pendingApprovals ? 'var(--amber)' : undefined} />
        <Stat value={`${data.teamAttendanceHours}h`} label="Team hours (week)" />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Under-loggers</h3>
          {data.underLoggers.length === 0 && <p className="muted">Everyone is on target. 👍</p>}
          {data.underLoggers.map((u) => (
            <div key={u.id} className="flex-between" style={{ marginBottom: 6 }}>
              <span>{u.name}</span>
              <span className="badge red">{u.loggedHours}h / {u.weeklyTarget}h</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Blocked tasks</h3>
          <div className="stat"><div className="value" style={{ color: data.blockedTasksTotal ? 'var(--red)' : undefined }}>{data.blockedTasksTotal}</div>
            <div className="label">across the team this week</div></div>
        </div>
      </div>

      <div className="card">
        <h3>Members</h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Team</th><th>Today</th><th>Hours (wk)</th><th>Logged</th><th>Late</th><th>Blocked</th><th>Leave bal.</th></tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id}>
                <td>{m.name} <span className="muted">· {m.role}</span></td>
                <td>{m.team || '—'}</td>
                <td>{m.presentToday ? <StatusBadge value="present" /> : <span className="badge gray">out</span>}</td>
                <td>{m.attendanceHours}h</td>
                <td style={m.underLogging ? { color: 'var(--red)' } : undefined}>{m.loggedHours}h</td>
                <td>{m.lateCount}</td>
                <td>{m.tasks.blocked}</td>
                <td>{m.leaveBalance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
