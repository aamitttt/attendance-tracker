import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, ErrorText } from '../components/ui.jsx';

const TYPES = ['casual', 'sick', 'earned', 'unpaid'];

export default function Leave() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(user.leaveBalance);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ type: 'casual', startDay: '', endDay: '', reason: '' });

  const load = useCallback(async () => {
    try {
      const [res, me] = await Promise.all([
        api('/leave', { params: { user: user.id || user._id } }),
        api('/auth/me'),
      ]);
      setLeaves(res.leaves);
      setBalance(me.user.leaveBalance);
    } catch (err) {
      setError(err);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      await api('/leave', { method: 'POST', body: form });
      setForm({ type: 'casual', startDay: '', endDay: '', reason: '' });
      await load();
    } catch (err) {
      setError(err);
    }
  }

  async function cancel(id) {
    if (!confirm('Cancel this leave request?')) return;
    try {
      await api(`/leave/${id}/cancel`, { method: 'PATCH' });
      await load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div>
      <h2>My Leave</h2>
      <p className="muted">Balance: <strong>{balance}</strong> days</p>

      <form className="card" onSubmit={submit}>
        <h3>Apply for leave</h3>
        <div className="row">
          <div><label>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label>Start</label><input type="date" value={form.startDay} onChange={(e) => setForm({ ...form, startDay: e.target.value })} required /></div>
          <div><label>End</label><input type="date" value={form.endDay} onChange={(e) => setForm({ ...form, endDay: e.target.value })} required /></div>
          <div style={{ flex: 2 }}><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <ErrorText error={error} />
        <button type="submit">Submit request</button>
      </form>

      <div className="card">
        <h3>My requests</h3>
        <table>
          <thead>
            <tr><th>Type</th><th>Range</th><th>Days</th><th>Status</th><th>Approver</th><th></th></tr>
          </thead>
          <tbody>
            {leaves.map((l) => (
              <tr key={l._id}>
                <td><StatusBadge value={l.type} /></td>
                <td>{l.startDay} → {l.endDay}</td>
                <td>{l.days}</td>
                <td><StatusBadge value={l.status} /></td>
                <td>{l.approver?.name || '—'}</td>
                <td>
                  {['pending', 'approved'].includes(l.status) && (
                    <button className="sm ghost" onClick={() => cancel(l._id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
            {leaves.length === 0 && <tr><td colSpan="6" className="muted">No requests yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
