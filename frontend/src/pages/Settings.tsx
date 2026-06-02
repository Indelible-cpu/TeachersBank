import React, { useState } from 'react';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, Camera, Trash2, Fingerprint } from 'lucide-react';
import { authApi, syncApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, pullFromServer, addToSyncQueue } from '../services/db';
import { useToast } from '../context/useToast';
import { startRegistration } from '@simplewebauthn/browser';
import { useTheme } from 'next-themes';
import { storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const Settings = () => {
  const { settings, updateSettings, isOnline } = useSettings();
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const toast = useToast();

  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showRemoveOption, setShowRemoveOption] = useState(false);
  const [showMasterReset, setShowMasterReset] = useState(false);
  const [resetData, setResetData] = useState({ reason: '', password: '' });
  const [isResetting, setIsResetting] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    (async () => {
      const photo = await getSetting(`profile_photo_${user?.id}`);
      if (photo) setProfilePhoto(photo);
    })();
  }, [user?.id]);

  React.useEffect(() => {
    setFormData(settings);
  }, [settings]);
  
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
    try {
      const sanitized = {
        ...formData,
        interestPercentage: Number(formData.interestPercentage) || 0,
        maturityMonths: Number(formData.maturityMonths) || 0
      };
      await updateSettings(sanitized);
      toast.success('System settings saved successfully!');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          } else {
            resolve(event.target?.result as string);
          }
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.id) {
      toast.success("Processing image...");
      
      try {
        const base64Data = await compressImage(file);
        
        // Convert base64 back to Blob for Firebase upload
        const response = await fetch(base64Data);
        const blob = await response.blob();

        // Safe check to verify if Firebase Storage is actually configured
        if (storage && storage.app && storage.app.options && storage.app.options.projectId && !storage.app.options.projectId.includes('placeholder')) {
          const fileRef = storageRef(storage, `profile_photos/${user.id}_${Date.now()}.jpg`);
          await uploadBytes(fileRef, blob);
          const downloadUrl = await getDownloadURL(fileRef);
          
          setProfilePhoto(downloadUrl);
          await setSetting(`profile_photo_${user.id}`, downloadUrl);
          
          await addToSyncQueue('UPDATE', 'users', { id: user.id, photo: downloadUrl });
          
          toast.success("Profile photo updated successfully");
          window.dispatchEvent(new CustomEvent('sync-completed'));
        } else {
          // Fallback to local Base64 string encoding inside IndexedDB
          setProfilePhoto(base64Data);
          await setSetting(`profile_photo_${user.id}`, base64Data);
          toast.success("Profile photo saved locally");
          window.dispatchEvent(new CustomEvent('sync-completed'));
        }
      } catch (error) {
        console.error("Error processing/uploading photo:", error);
        toast.error("Failed to process image.");
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (user?.id) {
      if (profilePhoto && profilePhoto.includes('firebasestorage')) {
        try {
          const photoRef = storageRef(storage, profilePhoto);
          await deleteObject(photoRef).catch(() => {});
        } catch (e) {
          console.warn("Storage deletion warning:", e);
        }
      }
      setProfilePhoto(null);
      await setSetting(`profile_photo_${user.id}`, null);
      setShowRemoveOption(false);
      toast.success("Profile photo removed");
      window.dispatchEvent(new CustomEvent('sync-completed'));
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

  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const handleRegisterBiometric = async () => {
    if (!isOnline) {
      toast.error('You must be online to set up biometric sign-in');
      return;
    }
    setIsRegisteringBiometric(true);
    try {
      const resp = await authApi.generateRegOptions();
      const options = resp.data;
      
      const attResp = await startRegistration({ optionsJSON: options });
      
      await authApi.verifyRegResponse(attResp);
      
      toast.success('Biometric login set up successfully!');
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        toast.error('Registration cancelled or not allowed');
      } else if (err.response?.data?.error) {
        toast.error(err.response.data.error);
      } else {
        toast.error('Failed to set up biometric login');
      }
    } finally {
      setIsRegisteringBiometric(false);
    }
  };

  const handleMasterReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetData.reason || !resetData.password) {
      toast.error('Reason and password are required.');
      return;
    }
    
    setIsResetting(true);
    try {
      await syncApi.masterReset(resetData);
      
      // Pull fresh data (which is now mostly empty) to update local IndexedDB
      await pullFromServer();
      
      toast.success('Master Reset completed successfully.');
      setShowMasterReset(false);
      setResetData({ reason: '', password: '' });
      
      // Optionally reload the window so the dashboard reflects empty state immediately
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Master Reset failed.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-8 pb-12">
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
                value={formData.interestPercentage === undefined || formData.interestPercentage === null || Number.isNaN(formData.interestPercentage) ? '' : formData.interestPercentage}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, interestPercentage: val === '' ? '' : parseFloat(val) } as any);
                }}
                className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="maturityMonths" className="text-sm font-medium">Cycle Maturity (Months)</label>
              <input
                id="maturityMonths"
                type="number"
                name="maturityMonths"
                value={formData.maturityMonths === undefined || formData.maturityMonths === null || Number.isNaN(formData.maturityMonths) ? '' : formData.maturityMonths}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, maturityMonths: val === '' ? '' : parseInt(val, 10) } as any);
                }}
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

        <div className="mt-8 pt-8 border-t border-destructive/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-destructive/5 border border-destructive/20 rounded-2xl">
            <div>
              <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Master Reset
              </h3>
              <p className="text-sm text-destructive/80 mt-1 max-w-lg">
                Permanently deletes all members, contributions, loans, and financial records. User accounts and system settings will remain intact.
              </p>
            </div>
            <button
              onClick={() => setShowMasterReset(true)}
              className="flex-shrink-0 px-6 py-3 bg-destructive text-white font-bold rounded-xl hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20"
            >
              Master Reset
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
              <label htmlFor="settingsCurrentPassword" className="text-sm font-medium">Current Password</label>
              <div className="relative">
                <input
                  id="settingsCurrentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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
              <label htmlFor="settingsNewPassword" className="text-sm font-medium">New Password</label>
              <div className="relative">
                <input
                  id="settingsNewPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
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
              <label htmlFor="settingsConfirmPassword" className="text-sm font-medium">Confirm New Password</label>
              <div className="relative">
                <input
                  id="settingsConfirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 pr-12 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
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

      {/* Biometric Login Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-2">
            <Fingerprint className="w-6 h-6 text-primary" />
            Biometric Sign-in
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up Fingerprint, Face ID, or Windows Hello to sign in instantly without a password.
          </p>
        </div>
        <button
          onClick={handleRegisterBiometric}
          disabled={isRegisteringBiometric || !isOnline}
          className="flex-shrink-0 flex items-center gap-2 px-6 py-3 bg-secondary text-foreground font-medium rounded-xl hover:bg-secondary/80 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <Fingerprint className="w-5 h-5" />
          {isRegisteringBiometric ? 'Setting up...' : 'Set up Biometric'}
        </button>
      </motion.div>

      {/* Master Reset Modal */}
      <AnimatePresence>
        {showMasterReset && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isResetting && setShowMasterReset(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass max-w-md w-full p-8 rounded-[2rem] space-y-6 shadow-2xl border border-destructive/20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 text-destructive border-b border-destructive/20 pb-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Confirm Master Reset</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-destructive/80">Danger Zone</p>
                </div>
              </div>
              
              <div className="p-4 bg-destructive/10 text-destructive text-sm font-medium rounded-xl">
                This action is irreversible. All financial records and member profiles will be permanently erased.
              </div>

              <form onSubmit={handleMasterReset} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason for Reset</label>
                  <textarea
                    value={resetData.reason}
                    onChange={(e) => setResetData({ ...resetData, reason: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-destructive outline-none transition-all resize-none h-24"
                    placeholder="e.g. End of financial year, starting fresh..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Password</label>
                  <input
                    type="password"
                    value={resetData.password}
                    onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-destructive outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowMasterReset(false)}
                    disabled={isResetting}
                    className="flex-1 py-3 bg-secondary hover:bg-secondary/80 font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isResetting || !resetData.reason || !resetData.password}
                    className="flex-1 py-3 bg-destructive hover:bg-destructive/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-destructive/20 disabled:opacity-50"
                  >
                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
