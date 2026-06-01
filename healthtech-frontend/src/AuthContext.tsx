import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string) => Promise<void>;
  logout: () => void;
  fetchMe: (token: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  const fetchMe = async (authToken: string): Promise<User | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        logout();
        return null;
      }
    } catch (error) {
      console.error("Error fetching user session", error);
      logout();
      return null;
    }
  };

  const login = async (accessToken: string, refreshToken: string) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    setToken(accessToken);
    await fetchMe(accessToken);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        await fetchMe(savedToken);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
