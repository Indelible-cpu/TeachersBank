import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';
import type { Settings } from '../types/settings';
import { SettingsContext } from './SettingsContextBase';

const defaultSettings: Settings = {
  systemName: 'TBTS',
  organizationName: 'Teachers Bank Tracking System',
  receiptFooter: 'Thank you for your contribution',
  defaultLanguage: 'en',
  logo: null,
  fontSize: 'medium',
  interestPercentage: 10,
  maturityMonths: 12,
  loanDurationThresholdAmount: 50000,
  loanDurationMonthsPerThreshold: 1,
  showProfileInHeader: true
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    let isMounted = true;
    (async () => {
      try {
        const localSettings = await getSetting('global_settings');
        if (localSettings && isMounted) {
          setSettingsState(localSettings);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    })();

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-sm', 'text-base', 'text-lg', 'text-xl');
    
    switch(settings.fontSize) {
      case 'small': root.classList.add('text-sm'); break;
      case 'large': root.classList.add('text-lg'); break;
      case 'xlarge': root.classList.add('text-xl'); break;
      default: root.classList.add('text-base'); break;
    }
  }, [settings.fontSize]);

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettingsState(updated);
    await setSetting('global_settings', updated);

    if (isOnline) {
      try {
        // await axios.put('/api/settings', updated);
      } catch {
        await addToSyncQueue('UPDATE', 'settings', updated);
      }
    } else {
      await addToSyncQueue('UPDATE', 'settings', updated);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isOnline }}>
      {children}
    </SettingsContext.Provider>
  );
};
