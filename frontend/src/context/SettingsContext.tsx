import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getSetting, setSetting, addToSyncQueue, performSync } from '../services/db';
import type { Settings } from '../types/settings';
import { SettingsContext } from './SettingsContextBase';
import { database, ref, onValue, isFirebaseConfigured } from '../services/firebase';

const defaultSettings: Settings = {
  systemName: 'TeachersBank',
  organizationName: 'Teachers Bank Management System',
  receiptFooter: 'Thank you for your contribution',
  defaultLanguage: 'en',
  logo: null,
  fontSize: 'medium',
  interestPercentage: 10,
  maturityMonths: 12,
  loanDurationRules: [
    { id: '1', minAmount: 5000, maxAmount: 50000, durationMonths: 3 },
    { id: '2', minAmount: 50001, maxAmount: 100000, durationMonths: 6 },
    { id: '3', minAmount: 100001, maxAmount: 500000, durationMonths: 12 },
    { id: '4', minAmount: 500001, maxAmount: 9999999, durationMonths: 24 }
  ],
  showProfileInHeader: true,
  currency: 'MWK',
  baseShareAmount: 50000,
  baseEmergencyAmount: 5000
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettingsState] = useState<Settings>(defaultSettings);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      performSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine) {
      performSync();
    }
    
    // Firebase Realtime Listener
    let unsubscribeFirebase = () => {};
    if (isFirebaseConfigured) {
      const syncRef = ref(database, 'sync/global/trigger');
      unsubscribeFirebase = onValue(syncRef, (snapshot) => {
        if (snapshot.exists()) {
          console.log('Firebase realtime sync triggered!', snapshot.val());
          if (navigator.onLine) {
             performSync();
          }
        }
      });
    }

    let isMounted = true;
    (async () => {
      try {
        const localSettings = await getSetting('global_settings');
        if (localSettings && isMounted) {
          const merged = {
            ...defaultSettings,
            ...localSettings
          };
          setSettingsState(merged);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    })();

    return () => {
      isMounted = false;
      unsubscribeFirebase();
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
    await addToSyncQueue('UPDATE', 'settings', updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isOnline }}>
      {children}
    </SettingsContext.Provider>
  );
};
