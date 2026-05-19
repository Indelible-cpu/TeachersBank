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
  login: (token: string, user: User, rememberMe?: boolean) => Promise<void>;
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

  async function loadAuth() {
    try {
      let storedToken = sessionStorage.getItem('auth_token');
      let storedUser: User | null = null;
      const sessionUserStr = sessionStorage.getItem('auth_user');
      if (sessionUserStr) {
        storedUser = JSON.parse(sessionUserStr) as User;
      }
      
      if (!storedToken || !storedUser) {
        // If not in sessionStorage, check persistent if remember_me is true
        const rememberMe = localStorage.getItem('remember_me') === 'true';
        if (rememberMe) {
          storedToken = await getSetting('auth_token');
          storedUser = await getSetting('auth_user');
        }
      }
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Failed to load auth', error);
    } finally {
      setIsLoading(false);
    }
  }

  const login = async (newToken: string, newUser: User, rememberMe = false) => {
    setToken(newToken);
    setUser(newUser);
    if (rememberMe) {
      await setSetting('auth_token', newToken);
      await setSetting('auth_user', newUser);
      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('remember_me', 'true');
      localStorage.setItem('remembered_email', newUser.email);
    } else {
      sessionStorage.setItem('auth_token', newToken);
      sessionStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('remember_me', 'false');
      localStorage.removeItem('auth_token');
      // If we don't remember, we can delete the saved token from IndexedDB so it's not loaded next time
      await setSetting('auth_token', null);
      await setSetting('auth_user', null);
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await setSetting('auth_token', null);
    await setSetting('auth_user', null);
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  // ADMIN is now read-only for finance as per new requirement
  const isReadOnly = user?.role === 'ADMIN';
  
  // TREASURER has confirmation power
  const canConfirm = user?.role === 'TREASURER';
  
  // SECRETARY can record finance
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
