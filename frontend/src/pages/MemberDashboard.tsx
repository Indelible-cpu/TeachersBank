import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useToast } from '../context/useToast';
import { getSetting, setSetting, addToSyncQueue, performSync } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Calendar, Edit2, ShieldAlert, TrendingUp, Camera, Trash2 } from 'lucide-react';
import { storage } from '../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const MemberDashboard = () => {
  const { user } = useAuth();
  const { settings, isOnline } = useSettings();
  const toast = useToast();
  const { t } = useTranslation();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memberRecord, setMemberRecord] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myLoans, setMyLoans] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myContributions, setMyContributions] = useState<any[]>([]);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  
  const [newLoan, setNewLoan] = useState({ principal: '', ruleId: '', fundType: 'SHARE' });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [showRemoveOption, setShowRemoveOption] = useState(false);

  const shareRules = settings.loanDurationRules || [];
  const emergencyRules = settings.emergencyLoanDurationRules || [];
  const activeRules = newLoan.fundType === 'SHARE' ? shareRules : emergencyRules;

  const loadData = async () => {
    if (!user) return;
    
    const members = await getSetting('members') || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = members.find((m: any) => m.userId === user.id || m.email === user.email);
    if (me) {
      setMemberRecord(me);
      
      const loans = await getSetting('loans') || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyLoans(loans.filter((l: any) => l.memberId === me.id));
      
      const contribs = await getSetting('contributions') || [];
      const shares = await getSetting('shareContributions') || [];
      const merged = [...contribs, ...shares];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyContributions(merged.filter((c: any) => c.memberId === me.id && c.status === 'CONFIRMED'));
      
      const photo = await getSetting(`profile_photo_${user.id}`);
      if (photo) setProfilePhoto(photo as string);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    
    const handleSyncCompleted = () => loadData();
    window.addEventListener('sync-completed', handleSyncCompleted);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-completed', handleSyncCompleted);
    };
  }, [user]);

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
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          } else resolve(event.target?.result as string);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.id) {
      toast.info(t('my_account.uploading_photo', 'Uploading photo...'));
      try {
        const base64Data = await compressImage(file);

        if (storage && storage.app && storage.app.options && storage.app.options.projectId && !storage.app.options.projectId.includes('placeholder')) {
          const response = await fetch(base64Data);
          const blob = await response.blob();
          const fileRef = storageRef(storage, `profile_photos/${user.id}_${Date.now()}.jpg`);
          await uploadBytes(fileRef, blob);
          const downloadUrl = await getDownloadURL(fileRef);
          
          setProfilePhoto(downloadUrl);
          await setSetting(`profile_photo_${user.id}`, downloadUrl);
          await addToSyncQueue('UPDATE', 'users', { id: user.id, photo: downloadUrl });
          
          toast.success(t('my_account.photo_updated', 'Profile photo updated'));
          window.dispatchEvent(new CustomEvent('sync-completed'));
        } else {
          setProfilePhoto(base64Data);
          await setSetting(`profile_photo_${user.id}`, base64Data);
          toast.success(t('my_account.photo_saved_local', 'Profile photo saved locally'));
          window.dispatchEvent(new CustomEvent('sync-completed'));
        }
      } catch (error) {
        console.error(error);
        toast.error(t('my_account.photo_upload_failed', 'Failed to upload image.'));
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (user?.id) {
      if (profilePhoto && profilePhoto.includes('firebasestorage')) {
        try {
          const photoRef = storageRef(storage, profilePhoto);
          await deleteObject(photoRef).catch(() => {});
        } catch (e) { console.warn(e); }
      }
      setProfilePhoto(null);
      await setSetting(`profile_photo_${user.id}`, null);
      setShowRemoveOption(false);
      toast.success(t('my_account.photo_removed', 'Profile photo removed'));
      window.dispatchEvent(new CustomEvent('sync-completed'));
    }
  };

  // Shares Calculations
  const memberShares = myContributions.filter(c => c.type === 'SHARE').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const shareInterestRate = settings.interestPercentage || 10;
  const shareEarnings = memberShares + (memberShares * (shareInterestRate / 100));
  const appliedShareLoan = myLoans.find(l => ['PENDING', 'VERIFIED'].includes(l.status) && l.fundType !== 'EMERGENCY');
  const activeShareLoan = myLoans.find(l => ['APPROVED'].includes(l.status) && l.fundType !== 'EMERGENCY');

  // Emergency Calculations
  const memberEmergency = myContributions.filter(c => c.type === 'EMERGENCY').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const emergencyInterestRate = settings.emergencyInterestPercentage || 0;
  const emergencyEarnings = memberEmergency + (memberEmergency * (emergencyInterestRate / 100));
  const appliedEmergencyLoan = myLoans.find(l => ['PENDING', 'VERIFIED'].includes(l.status) && l.fundType === 'EMERGENCY');
  const activeEmergencyLoan = myLoans.find(l => ['APPROVED'].includes(l.status) && l.fundType === 'EMERGENCY');

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberRecord) return;
    
    const isEmergency = newLoan.fundType === 'EMERGENCY';
    
    if (isEmergency && appliedEmergencyLoan) {
      toast.error(t('my_account.pending_emergency_loan', 'You already have a pending Emergency Fund loan.'));
      return;
    }
    
    if (!isEmergency && appliedShareLoan) {
      toast.error(t('my_account.pending_share_loan', 'You already have a pending Share Fund loan.'));
      return;
    }

    let isTopUp = false;
    const activeLoan = isEmergency ? activeEmergencyLoan : activeShareLoan;

    if (activeLoan) {
      const repaidAmount = activeLoan.expectedReturn - activeLoan.balance;
      const repaidRatio = repaidAmount / activeLoan.expectedReturn;
      if (repaidRatio < 0.75) {
        toast.error(t('my_account.topup_requirement', 'You must repay at least 75% of your active loan before requesting a top-up.'));
        return;
      }
      isTopUp = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = activeRules.find((r: any) => r.id === newLoan.ruleId);
    if (!rule) { toast.error(t('my_account.select_loan_rule', 'Select a loan rule')); return; }
    
    const principal = parseFloat(newLoan.principal);
    if (principal < rule.minAmount || principal > rule.maxAmount) {
      toast.error(t('my_account.loan_amount_range', { min: rule.minAmount, max: rule.maxAmount, defaultValue: `Amount must be between ${rule.minAmount} and ${rule.maxAmount}` }));
      return;
    }

    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + rule.durationMonths);
    
    const interestRate = isEmergency ? emergencyInterestRate : shareInterestRate;
    const loanInterestAmount = principal * (interestRate / 100);
    const expectedReturn = principal + loanInterestAmount;
    
    const loan = {
      id: Date.now().toString(),
      memberId: memberRecord.id,
      memberName: memberRecord.fullname,
      principal,
      interestRate,
      expectedReturn,
      balance: expectedReturn,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'PENDING',
      fundType: newLoan.fundType,
      isTopUp,
      timestamp: new Date().toISOString()
    };
    
    await addToSyncQueue('CREATE', 'loans', loan);
    toast.success(t('my_account.loan_requested', 'Loan requested successfully. Awaiting Secretary verification.'));
    setIsLoanModalOpen(false);
    setNewLoan({ principal: '', ruleId: '', fundType: 'SHARE' });
    loadData();
    if (isOnline) performSync();
  };


  return (
    <div className="w-full max-w-none space-y-8 pb-12 px-4 lg:px-8 pt-4 lg:pt-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('my_account.title')}</h1>
          <p className="text-muted-foreground font-medium italic">{t('my_account.welcome')}{user?.name?.split('|')[0]?.split(' ')[0]}</p>
        </div>
        
        <div className="relative group shrink-0">
          <div 
            onClick={() => profilePhoto && setShowRemoveOption(!showRemoveOption)}
            className={`w-20 h-20 rounded-full bg-primary/10 border-4 border-background shadow-xl overflow-hidden flex items-center justify-center cursor-pointer transition-all ${profilePhoto ? 'hover:opacity-80' : ''}`}
          >
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{user?.name?.charAt(0)}</span>
            )}
          </div>
          <label className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
            <Camera className="w-3.5 h-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          
          <AnimatePresence>
            {showRemoveOption && profilePhoto && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl">
        <button onClick={() => {
          setIsLoanModalOpen(true);
        }} className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
          <Banknote className="w-5 h-5" /> {t('my_account.request_loan')}
        </button>
        <div className="relative flex-1">
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Share Fund & Emergency Fund Cards */}
        <div className="space-y-8">
          
          {/* Share Fund Card */}
          <div className="glass p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group border border-emerald-500/10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-500" /> {t('my_account.shares_earnings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.total_shares')}</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{settings.currency} {memberShares.toLocaleString()}</h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.total_earnings')}</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {settings.currency} {shareEarnings.toLocaleString()}
                </h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-amber-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.applied_loan')}</p>
                <h3 className="text-2xl font-bold text-amber-500">{settings.currency} {appliedShareLoan?.principal?.toLocaleString() || 0}</h3>
                {appliedShareLoan && <p className="text-[10px] font-bold uppercase mt-1 text-amber-500/70">{appliedShareLoan.status} {appliedShareLoan.isTopUp ? '(TOP UP)' : ''}</p>}
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-rose-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.active_loan')}</p>
                <h3 className="text-2xl font-bold text-rose-500">{settings.currency} {activeShareLoan?.balance?.toLocaleString() || 0}</h3>
                {activeShareLoan && <p className="text-[10px] font-bold uppercase mt-1 text-rose-500/70">{activeShareLoan.status}</p>}
              </div>
            </div>
          </div>

          {/* Emergency Fund Card */}
          <div className="glass p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group border border-amber-500/10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-amber-500" /> {t('my_account.emergency_fund')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.total_emergency')}</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{settings.currency} {memberEmergency.toLocaleString()}</h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.total_earnings')}</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {settings.currency} {emergencyEarnings.toLocaleString()}
                </h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-amber-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.applied_loan')}</p>
                <h3 className="text-2xl font-bold text-amber-500">{settings.currency} {appliedEmergencyLoan?.principal?.toLocaleString() || 0}</h3>
                {appliedEmergencyLoan && <p className="text-[10px] font-bold uppercase mt-1 text-amber-500/70">{appliedEmergencyLoan.status} {appliedEmergencyLoan.isTopUp ? '(TOP UP)' : ''}</p>}
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-rose-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">{t('my_account.active_loan')}</p>
                <h3 className="text-2xl font-bold text-rose-500">{settings.currency} {activeEmergencyLoan?.balance?.toLocaleString() || 0}</h3>
                {activeEmergencyLoan && <p className="text-[10px] font-bold uppercase mt-1 text-rose-500/70">{activeEmergencyLoan.status}</p>}
              </div>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {isLoanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsLoanModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6 tracking-tight">{t('my_account.request_loan')}</h2>
              <form onSubmit={handleRequestLoan} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">{t('my_account.fund_type')}</label>
                  <select required value={newLoan.fundType} onChange={e => setNewLoan({...newLoan, fundType: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary">
                    <option value="SHARE">{t('my_account.share_fund')}</option>
                    <option value="EMERGENCY">{t('my_account.emergency_fund_option')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">{t('my_account.loan_rule')}</label>
                  <select required value={newLoan.ruleId} onChange={e => setNewLoan({...newLoan, ruleId: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary">
                    <option value="">{t('my_account.select_range')}</option>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {activeRules.map((r: any) => <option key={r.id} value={r.id}>{r.minAmount} - {r.maxAmount} ({r.durationMonths}m)</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">{t('my_account.principal')} ({settings.currency})</label>
                  <input required type="number" value={newLoan.principal} onChange={e => setNewLoan({...newLoan, principal: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary" />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsLoanModalOpen(false)} className="flex-1 py-4 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors">{t('my_account.cancel')}</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">{t('my_account.submit_request')}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default MemberDashboard;
