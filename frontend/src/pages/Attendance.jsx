import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { StatusBadge, ErrorText } from '../components/ui.jsx';

export default function Attendance() {
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, h] = await Promise.all([api('/attendance/today'), api('/attendance')]);
      setToday(t.attendance);
      setHistory(h.attendance);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(path, body) {
    setBusy(true);
    setError(null);
    try {
      await api(`/attendance/${path}`, { method: 'POST', body });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const checkedIn = today && today.checkIn;
  const checkedOut = today && today.checkOut;

  return (
    <div>
      <h2>Attendance</h2>

      <div className="card">
        <div className="flex-between">
          <div>
            <strong>Today</strong>
            <div className="muted" style={{ fontSize: 13 }}>
              {checkedIn
                ? `Checked in at ${new Date(today.checkIn).toLocaleTimeString()}${today.late ? ' (late)' : ''}`
                : 'Not checked in yet'}
              {checkedOut && ` · out at ${new Date(today.checkOut).toLocaleTimeString()} · ${today.hoursWorked}h`}
            </div>
          </div>
          <div className="pill-row">
            <button disabled={busy || checkedIn} onClick={() => act('check-in', { status: 'present' })}>
              Check in
            </button>
            <button className="ghost" disabled={busy || checkedIn} onClick={() => act('check-in', { status: 'wfh' })}>
              Check in (WFH)
            </button>
            <button className="success" disabled={busy || !checkedIn || checkedOut} onClick={() => act('check-out', {})}>
              Check out
            </button>
          </div>
        </div>
        <ErrorText error={error} />
      </div>

      <div className="card">
        <h3>History</h3>
        <table>
          <thead>
            <tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th>Hours</th><th>Flags</th></tr>
          </thead>
          <tbody>
            {history.map((a) => (
              <tr key={a._id}>
                <td>{a.day}</td>
                <td><StatusBadge value={a.status} /></td>
                <td>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                <td>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                <td>{a.hoursWorked}h</td>
                <td className="pill-row">
                  {a.late && <span className="badge amber">late</span>}
                  {a.missingCheckout && <span className="badge red">no check-out</span>}
                </td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan="6" className="muted">No records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
