import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { StatusBadge, ErrorText } from '../components/ui.jsx';

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api('/leave/pending');
      setPending(res.leaves);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/leave/${id}/decision`, { method: 'PATCH', body: { decision } });
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2>Pending Approvals</h2>
      <p className="muted">Leave requests from your team awaiting a decision.</p>
      <ErrorText error={error} />
      <div className="card">
        <table>
          <thead>
            <tr><th>Employee</th><th>Type</th><th>Range</th><th>Days</th><th>Balance</th><th>Reason</th><th>Decision</th></tr>
          </thead>
          <tbody>
            {pending.map((l) => (
              <tr key={l._id}>
                <td>{l.user?.name}</td>
                <td><StatusBadge value={l.type} /></td>
                <td>{l.startDay} → {l.endDay}</td>
                <td>{l.days}</td>
                <td>{l.user?.leaveBalance}</td>
                <td className="muted">{l.reason || '—'}</td>
                <td className="pill-row">
                  <button className="sm success" disabled={busyId === l._id} onClick={() => decide(l._id, 'approved')}>Approve</button>
                  <button className="sm danger" disabled={busyId === l._id} onClick={() => decide(l._id, 'rejected')}>Reject</button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && <tr><td colSpan="7" className="muted">Nothing pending. 🎉</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
