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
  isReadOnly: boolean; // General UI restriction
  canConfirm: boolean; // Treasurer verification power
  canWriteFinance: boolean; // Secretary recording power
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

  // ADMIN is now read-only for finance as per new requirement
  const isReadOnly = user?.role === 'ADMIN';
  
  // TREASURER has confirmation power
  const canConfirm = user?.role === 'TREASURER';
  
  // SECRETARY records finance
  const canWriteFinance = user?.role === 'SECRETARY';

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated: !!token, 
      isReadOnly,
      canConfirm,
      canWriteFinance
    }}>
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
