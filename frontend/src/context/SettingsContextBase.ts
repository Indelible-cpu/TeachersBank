import { createContext } from 'react';
import type { Settings } from '../types/settings';

export interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  isOnline: boolean;
}

export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);
