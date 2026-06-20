import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { StatusBadge, ErrorText } from '../components/ui.jsx';

const STATUSES = ['in_progress', 'done', 'blocked'];
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function WorkLogs() {
  const { user } = useAuth();
  const isManagerOrAdmin = user.role !== 'employee';

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [people, setPeople] = useState([]);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({ from: '', to: '', project: '', status: '', user: '', page: 1, limit: 10 });
  const [form, setForm] = useState({ day: todayStr(), title: '', project: '', hoursSpent: 1, status: 'in_progress', description: '' });
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api('/work-logs', { params: filters });
      setLogs(res.workLogs);
      setPagination(res.pagination);
    } catch (err) {
      setError(err);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isManagerOrAdmin) api('/users').then((r) => setPeople(r.users)).catch(() => {});
  }, [isManagerOrAdmin]);

  function setFilter(k, v) {
    setFilters((f) => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    try {
      const body = { ...form, hoursSpent: Number(form.hoursSpent) };
      if (editingId) await api(`/work-logs/${editingId}`, { method: 'PATCH', body });
      else await api('/work-logs', { method: 'POST', body });
      setForm({ day: todayStr(), title: '', project: '', hoursSpent: 1, status: 'in_progress', description: '' });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err);
    }
  }

  function startEdit(log) {
    setEditingId(log._id);
    setForm({
      day: log.day, title: log.title, project: log.project,
      hoursSpent: log.hoursSpent, status: log.status, description: log.description || '',
    });
  }

  async function remove(id) {
    if (!confirm('Delete this work log?')) return;
    await api(`/work-logs/${id}`, { method: 'DELETE' });
    await load();
  }

  const canEdit = (log) => user.role === 'admin' || log.user?._id === user.id || log.user?._id === user._id;

  return (
    <div>
      <h2>Work Logs</h2>

      <form className="card" onSubmit={submit}>
        <h3>{editingId ? 'Edit log' : 'Add a log'}</h3>
        <div className="row">
          <div><label>Date</label><input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></div>
          <div style={{ flex: 2 }}><label>Title</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div><label>Project</label><input value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} required /></div>
          <div><label>Hours</label><input type="number" min="0" max="24" step="0.5" value={form.hoursSpent} onChange={(e) => setForm({ ...form, hoursSpent: e.target.value })} /></div>
          <div><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>Description</label><textarea rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <ErrorText error={error} />
        <div className="pill-row">
          <button type="submit">{editingId ? 'Save' : 'Add log'}</button>
          {editingId && <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm({ day: todayStr(), title: '', project: '', hoursSpent: 1, status: 'in_progress', description: '' }); }}>Cancel</button>}
        </div>
      </form>

      <div className="card">
        <h3>Filter</h3>
        <div className="row">
          <div><label>From</label><input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} /></div>
          <div><label>To</label><input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} /></div>
          <div><label>Project</label><input value={filters.project} onChange={(e) => setFilter('project', e.target.value)} placeholder="any" /></div>
          <div><label>Status</label>
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
              <option value="">any</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          {isManagerOrAdmin && (
            <div><label>Employee</label>
              <select value={filters.user} onChange={(e) => setFilter('user', e.target.value)}>
                <option value="">everyone in scope</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Date</th>{isManagerOrAdmin && <th>Who</th>}<th>Title</th><th>Project</th><th>Hours</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td>{l.day}</td>
                {isManagerOrAdmin && <td>{l.user?.name}</td>}
                <td>{l.title}</td>
                <td>{l.project}</td>
                <td>{l.hoursSpent}h</td>
                <td><StatusBadge value={l.status} /></td>
                <td className="pill-row">
                  {canEdit(l) && <button className="sm ghost" onClick={() => startEdit(l)}>Edit</button>}
                  {canEdit(l) && <button className="sm danger" onClick={() => remove(l._id)}>Del</button>}
                </td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan="7" className="muted">No logs match.</td></tr>}
          </tbody>
        </table>
        <div className="pagination">
          <button className="sm ghost" disabled={filters.page <= 1} onClick={() => setFilter('page', filters.page - 1)}>Prev</button>
          <span className="muted">Page {pagination.page} of {pagination.pages} · {pagination.total} total</span>
          <button className="sm ghost" disabled={filters.page >= pagination.pages} onClick={() => setFilter('page', filters.page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
