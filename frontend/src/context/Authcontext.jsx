import { createContext, useState, useContext, useEffect } from 'react';
import { authAPI, gamificationAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
  const token = localStorage.getItem('access_token');
  if (token) {
    try {
      const response = await gamificationAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      localStorage.clear();
      setUser(null);
    }
  }
  setLoading(false);
};

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    await checkAuth();
  };

  const register = async (name, email, password) => {
    await authAPI.register({ name, email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);