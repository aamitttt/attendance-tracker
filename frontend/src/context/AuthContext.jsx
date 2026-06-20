import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from a stored token on first load.
  useEffect(() => {
    async function bootstrap() {
      if (!getToken()) return setLoading(false);
      try {
        const { user } = await api('/auth/me');
        setUser(user);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const { token, user } = await api('/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
