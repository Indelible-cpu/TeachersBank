import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import nyTranslation from './locales/ny.json';
import { getSetting, setSetting } from '../services/db';

// Initializing i18n with Chichewa and English support
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      ny: { translation: nyTranslation }
    },
    fallbackLng: 'en',
    saveMissing: true,
    missingKeyHandler: async (lngs, ns, key, fallbackValue) => {
      // Log missing key to indexedDB for admin to see
      const missingKeys = await getSetting('missing_translations') || [];
      if (!missingKeys.includes(key)) {
        missingKeys.push(key);
        await setSetting('missing_translations', missingKeys);
      }
    },
    interpolation: {
      escapeValue: false,
    },
  });

// Load dynamic translations from DB and inject them
export const loadDynamicTranslations = async () => {
  try {
    const translations = await getSetting('translations');
    if (translations && Array.isArray(translations)) {
      const enDynamic: Record<string, string> = {};
      const nyDynamic: Record<string, string> = {};
      
      translations.forEach(t => {
        if (t.en) enDynamic[t.key] = t.en;
        if (t.ny) nyDynamic[t.key] = t.ny;
      });

      i18n.addResourceBundle('en', 'translation', enDynamic, true, true);
      i18n.addResourceBundle('ny', 'translation', nyDynamic, true, true);
    }
  } catch (error) {
    console.error('Failed to load dynamic translations:', error);
  }
};

// Initial load
loadDynamicTranslations();

// Allow reloading when sync happens
if (typeof window !== 'undefined') {
  window.addEventListener('sync-completed', loadDynamicTranslations);
}

export default i18n;
