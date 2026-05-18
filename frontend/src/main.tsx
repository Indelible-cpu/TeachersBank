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

// Clear legacy service workers and caches once (forces browser upgrade from TBTS/TEBAMS to TeachersBank)
if ('serviceWorker' in navigator) {
  const pwaCleared = localStorage.getItem('pwa_legacy_cleared_v3');
  if (!pwaCleared) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (registrations.length > 0) {
        for (const registration of registrations) {
          registration.unregister();
        }
        if ('caches' in window) {
          caches.keys().then((names) => {
            for (const name of names) {
              caches.delete(name);
            }
          });
        }
        localStorage.setItem('pwa_legacy_cleared_v3', 'true');
        window.location.reload();
      } else {
        localStorage.setItem('pwa_legacy_cleared_v3', 'true');
      }
    });
  }
}

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
