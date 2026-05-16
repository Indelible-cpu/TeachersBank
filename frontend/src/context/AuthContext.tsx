import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getSetting, setSetting } from '../services/db';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TREASURER' | 'SECRETARY' | 'MEMBER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuth();
  }, []);

  const loadAuth = async () => {
    try {
      const storedToken = await getSetting('auth_token');
      const storedUser = await getSetting('auth_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Failed to load auth', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    await setSetting('auth_token', newToken);
    await setSetting('auth_user', newUser);
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await setSetting('auth_token', null);
    await setSetting('auth_user', null);
    localStorage.removeItem('auth_token');
  };

  // Treasurer is read-only as per user requirement
  const isReadOnly = user?.role === 'TREASURER';

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
