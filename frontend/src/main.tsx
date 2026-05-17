import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './translations/i18n';
import { initDB } from './services/db';
import { ThemeProvider } from 'next-themes';
import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { PWAProvider } from './context/PWAContext';
import { ToastProvider } from './context/ToastContext';

// Initialize IndexedDB
initDB();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SettingsProvider>
        <AuthProvider>
          <PWAProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </PWAProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>,
);
