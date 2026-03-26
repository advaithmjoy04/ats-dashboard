import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('ats_token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get('/auth/me');
        if (!ignore) {
          setUser(data);
          localStorage.setItem('ats_user_role', JSON.stringify(data.role));
        }
      } catch (error) {
        if (!ignore) {
          localStorage.removeItem('ats_token');
          localStorage.removeItem('ats_user_role');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadUser();
    return () => {
      ignore = true;
    };
  }, [token]);

  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    localStorage.setItem('ats_token', data.accessToken);
    setToken(data.accessToken);
    const me = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    setUser(me.data);
    localStorage.setItem('ats_user_role', JSON.stringify(me.data.role));
    return me.data;
  }

  function logout() {
    localStorage.removeItem('ats_token');
    localStorage.removeItem('ats_user_role');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
