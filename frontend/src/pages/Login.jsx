import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { ErrorText } from '../components/ui.jsx';

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('admin@acme.test');
  const [password, setPassword] = useState('Password123');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(name, email, password);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function useDemo(demoEmail) {
    setMode('login');
    setEmail(demoEmail);
    setPassword('Password123');
  }

  const DEMOS = [
    { role: 'Admin', name: 'Arjun Singh', email: 'admin@acme.test', color: 'indigo' },
    { role: 'Manager', name: 'Amit', email: 'maya@acme.test', color: 'amber' },
    { role: 'Employee', name: 'Sunil', email: 'eli@acme.test', color: 'green' },
  ];

  return (
    <div className="center-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <div>
            <div className="brand-title">Attendance Tracker</div>
            <div className="brand-sub">Daily work &amp; attendance for real teams</div>
          </div>
        </div>
      <form className="card" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        {mode === 'signup' && (
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <ErrorText error={error} />
        <button type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
        </button>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </a>
        </p>
        <div className="demo-creds">
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
            Demo credentials — click to fill (password <code>Password123</code>)
          </div>
          {DEMOS.map((d) => (
            <button key={d.email} type="button" className="demo-card" onClick={() => useDemo(d.email)}>
              <span className={`badge ${d.color}`}>{d.role}</span>
              <span className="demo-name">{d.name}</span>
              <span className="demo-email">{d.email}</span>
            </button>
          ))}
        </div>
      </form>
      </div>
    </div>
  );
}
