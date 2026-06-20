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

  return (
    <div className="center-page">
      <form className="card auth-card" onSubmit={submit}>
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
          <button type="button" className="demo-card" onClick={() => useDemo('admin@acme.test')}>
            <span className="badge indigo">Admin / HR</span>
            <span className="demo-email">admin@acme.test</span>
          </button>
          <button type="button" className="demo-card" onClick={() => useDemo('eli@acme.test')}>
            <span className="badge green">Employee</span>
            <span className="demo-email">eli@acme.test</span>
          </button>
        </div>
      </form>
    </div>
  );
}
