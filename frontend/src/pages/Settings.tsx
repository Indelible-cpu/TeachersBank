import React, { useState } from 'react';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, Camera, Trash2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting } from '../services/db';

const Settings = () => {
  const { settings, updateSettings, isOnline } = useSettings();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showRemoveOption, setShowRemoveOption] = useState(false);

  React.useEffect(() => {
    (async () => {
      const photo = await getSetting(`profile_photo_${user?.id}`);
      if (photo) setProfilePhoto(photo);
    })();
  }, [user?.id]);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateSettings(formData);
    setTimeout(() => setIsSaving(false), 500);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setProfilePhoto(base64);
        if (user?.id) {
          await setSetting(`profile_photo_${user.id}`, base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    if (user?.id) {
      await setSetting(`profile_photo_${user.id}`, null);
      setProfilePhoto(null);
      setShowRemoveOption(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">Configure global system parameters and security.</p>
      </div>

      {!isOnline && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{t('settings.offline_notice')}</p>
        </div>
      )}

      {/* Profile Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center gap-4"
      >
        <div className="relative group">
          <div 
            onClick={() => profilePhoto && setShowRemoveOption(!showRemoveOption)}
            className={`w-24 h-24 rounded-full bg-primary/10 border-4 border-background shadow-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all ${profilePhoto ? 'hover:opacity-80' : ''}`}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-primary">{user?.name?.charAt(0)}</span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
            <Camera className="w-4 h-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} title="Upload Profile Photo" aria-label="Upload Profile Photo" />
          </label>
          
          <AnimatePresence>
            {showRemoveOption && profilePhoto && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-10"
                title="Remove photo"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold">{user?.name}</h2>
          <p className="text-xs font-semibold capitalize tracking-widest text-muted-foreground">{user?.role?.toLowerCase()}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </motion.div>

      {/* User Preferences Section (Global - Accessible to all users) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Eye className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Preferences</h2>
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
          <div>
            <p className="text-sm font-bold">Header Profile Card</p>
            <p className="text-[10px] text-muted-foreground">Show your name and photo in the top bar.</p>
          </div>
          <button
            type="button"
            title="Toggle Header Profile"
            onClick={async () => {
              const updated = { ...formData, showProfileInHeader: !formData.showProfileInHeader };
              setFormData(updated);
              await updateSettings(updated);
            }}
            className={`w-12 h-6 rounded-full p-1 transition-colors ${formData.showProfileInHeader ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${formData.showProfileInHeader ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </motion.div>

      {/* System Settings Section (Admin Only) */}
      {isAdmin && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Save className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">General Settings</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="systemName" className="text-sm font-medium">{t('settings.system_name')}</label>
              <input
                id="systemName"
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
              <label htmlFor="interestPercentage" className="text-sm font-medium">Loan Interest Rate (%)</label>
              <input
                id="interestPercentage"
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
                type="number"
                name="maturityMonths"
                value={formData.maturityMonths}
                onChange={(e) => setFormData({ ...formData, maturityMonths: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium">Currency symbol</label>
              <input
                id="currency"
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="e.g. MWK"
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
      )}

      {/* Loan Term & Range Configuration (Admin Only) */}
      {isAdmin && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Save className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Loan Term & Range Configuration</h2>
        </div>

        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Min Amount ({settings.currency})</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Max Amount ({settings.currency})</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Duration (Months)</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(formData.loanDurationRules || []).map((rule, idx) => (
                  <tr key={rule.id || idx} className="border-b border-border/20 hover:bg-secondary/10">
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.minAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.maxAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.durationMonths} Months
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedRules = (formData.loanDurationRules || []).filter(r => r.id !== rule.id);
                          const updated = { ...formData, loanDurationRules: updatedRules };
                          setFormData(updated);
                          await updateSettings(updated);
                        }}
                        className="text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors border border-destructive/20"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-secondary/30 rounded-xl border border-border/50 space-y-4">
            <p className="text-xs font-black uppercase tracking-widest text-primary">Add New Range</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground" htmlFor="new-rule-min">Min Amount</label>
                <input
                  id="new-rule-min"
                  type="number"
                  placeholder="e.g. 1"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground" htmlFor="new-rule-max">Max Amount</label>
                <input
                  id="new-rule-max"
                  type="number"
                  placeholder="e.g. 50000"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground" htmlFor="new-rule-duration">Duration (Months)</label>
                <input
                  id="new-rule-duration"
                  type="number"
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 bg-secondary/50 border border-border/50 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-xs"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const minVal = parseFloat((document.getElementById('new-rule-min') as HTMLInputElement)?.value) || 0;
                const maxVal = parseFloat((document.getElementById('new-rule-max') as HTMLInputElement)?.value) || 0;
                const durVal = parseInt((document.getElementById('new-rule-duration') as HTMLInputElement)?.value) || 0;
                
                if (maxVal > minVal && durVal > 0) {
                  const newRule = {
                    id: Date.now().toString(),
                    minAmount: minVal,
                    maxAmount: maxVal,
                    durationMonths: durVal
                  };
                  const updatedRules = [...(formData.loanDurationRules || []), newRule];
                  const updated = { ...formData, loanDurationRules: updatedRules };
                  setFormData(updated);
                  await updateSettings(updated);
                  
                  // Clear fields
                  (document.getElementById('new-rule-min') as HTMLInputElement).value = '';
                  (document.getElementById('new-rule-max') as HTMLInputElement).value = '';
                  (document.getElementById('new-rule-duration') as HTMLInputElement).value = '';
                }
              }}
              className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-lg hover:opacity-90 active:scale-[0.98] transition-all"
            >
              + Add Range
            </button>
          </div>
        </div>
      </motion.div>
      )}

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold">Security & Password</h2>
        </div>

        {passwordError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex justify-end">
            <button
              type="submit"
              disabled={isChangingPassword || !isOnline}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Lock className="w-5 h-5" />
              {isChangingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Settings;
