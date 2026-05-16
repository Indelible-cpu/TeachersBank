import React, { useState } from 'react';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Save, AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

const Settings = () => {
  const { settings, updateSettings, isOnline } = useSettings();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(formData);
    setTimeout(() => setIsSaving(false), 500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">Configure global system parameters.</p>
      </div>

      {!isOnline && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{t('settings.offline_notice')}</p>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="systemName" className="text-sm font-medium">{t('settings.system_name')}</label>
              <input
                id="systemName"
                aria-label={t('settings.system_name')}
                type="text"
                name="systemName"
                value={formData.systemName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="organizationName" className="text-sm font-medium">{t('settings.organization_name')}</label>
              <input
                id="organizationName"
                aria-label={t('settings.organization_name')}
                type="text"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="receiptFooter" className="text-sm font-medium">{t('settings.receipt_footer')}</label>
              <input
                id="receiptFooter"
                aria-label={t('settings.receipt_footer')}
                type="text"
                name="receiptFooter"
                value={formData.receiptFooter}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="themeSelect" className="text-sm font-medium">Theme</label>
              <select
                id="themeSelect"
                aria-label="Theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="fontSizeSelect" className="text-sm font-medium">Accessibility (Font Size)</label>
              <select
                id="fontSizeSelect"
                aria-label="Font Size"
                name="fontSize"
                value={formData.fontSize}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="interestPercentage" className="text-sm font-medium">Loan Interest Rate (%)</label>
              <input
                id="interestPercentage"
                aria-label="Interest Rate"
                type="number"
                name="interestPercentage"
                value={formData.interestPercentage}
                onChange={(e) => setFormData({ ...formData, interestPercentage: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maturityMonths" className="text-sm font-medium">Cycle Maturity (Months)</label>
              <input
                id="maturityMonths"
                aria-label="Maturity Months"
                type="number"
                name="maturityMonths"
                value={formData.maturityMonths}
                onChange={(e) => setFormData({ ...formData, maturityMonths: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : t('settings.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Settings;
