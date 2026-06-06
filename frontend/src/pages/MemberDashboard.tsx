import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useToast } from '../context/useToast';
import { getSetting, addToSyncQueue, performSync } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Calendar, Edit2, ShieldAlert, TrendingUp, Bell } from 'lucide-react';

const MemberDashboard = () => {
  const { user } = useAuth();
  const { settings, isOnline } = useSettings();
  const toast = useToast();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memberRecord, setMemberRecord] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myLoans, setMyLoans] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myContributions, setMyContributions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [newLoan, setNewLoan] = useState({ principal: '', ruleId: '', fundType: 'SHARE' });

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
      
      const notifs = await getSetting('notifications') || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setNotifications(notifs.filter((n: any) => n.userId === user.id).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
      toast.error('System Rejected: You already have a pending/applied loan from the Emergency Fund.');
      return;
    }
    
    if (!isEmergency && appliedShareLoan) {
      toast.error('System Rejected: You already have a pending/applied loan from the Share Fund.');
      return;
    }

    let isTopUp = false;
    const activeLoan = isEmergency ? activeEmergencyLoan : activeShareLoan;

    if (activeLoan) {
      const repaidAmount = activeLoan.expectedReturn - activeLoan.balance;
      const repaidRatio = repaidAmount / activeLoan.expectedReturn;
      if (repaidRatio < 0.75) {
        toast.error('System Rejected: You must repay at least 75% of your active loan before requesting a top-up.');
        return;
      }
      isTopUp = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = activeRules.find((r: any) => r.id === newLoan.ruleId);
    if (!rule) { toast.error('Select a loan rule'); return; }
    
    const principal = parseFloat(newLoan.principal);
    if (principal < rule.minAmount || principal > rule.maxAmount) {
      toast.error(`Amount must be between ${rule.minAmount} and ${rule.maxAmount}`);
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
    toast.success('Loan requested successfully. Awaiting Secretary verification.');
    setIsLoanModalOpen(false);
    setNewLoan({ principal: '', ruleId: '', fundType: 'SHARE' });
    loadData();
    if (isOnline) performSync();
  };


  return (
    <div className="w-full max-w-none space-y-8 pb-12 px-4 lg:px-8 pt-4 lg:pt-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground font-medium italic">Welcome back, {user?.name}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 max-w-4xl">
        <button onClick={() => {
          setIsLoanModalOpen(true);
        }} className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
          <Banknote className="w-5 h-5" /> Request Loan
        </button>
        <div className="relative flex-1">
          <button onClick={() => setShowNotifications(!showNotifications)} className="w-full h-full py-4 bg-secondary text-secondary-foreground font-bold rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 border border-border">
            <Bell className="w-5 h-5" /> Notifications 
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">{notifications.filter(n => !n.isRead).length}</span>
            )}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full mt-2 left-0 right-0 bg-background border border-border rounded-2xl shadow-2xl z-40 max-h-80 overflow-y-auto p-4 custom-scrollbar">
                <h3 className="font-bold mb-3 text-lg">Notifications</h3>
                <div className="space-y-2">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} className="p-3 bg-secondary/30 rounded-xl border border-border/50 text-sm">
                      <p className="font-bold">{n.title}</p>
                      <p className="text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-2 opacity-60">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  )) : (
                    <p className="text-muted-foreground text-sm italic text-center py-4">No new notifications</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Share Fund & Emergency Fund Cards */}
        <div className="space-y-8">
          
          {/* Share Fund Card */}
          <div className="glass p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group border border-emerald-500/10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <Wallet className="text-emerald-500" /> Shares & Earnings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Total Shares</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{settings.currency} {memberShares.toLocaleString()}</h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Total Earnings</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {settings.currency} {shareEarnings.toLocaleString()}
                </h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-amber-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Applied Loan</p>
                <h3 className="text-2xl font-bold text-amber-500">{settings.currency} {appliedShareLoan?.principal?.toLocaleString() || 0}</h3>
                {appliedShareLoan && <p className="text-[10px] font-bold uppercase mt-1 text-amber-500/70">{appliedShareLoan.status} {appliedShareLoan.isTopUp ? '(TOP UP)' : ''}</p>}
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-rose-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Active Loan</p>
                <h3 className="text-2xl font-bold text-rose-500">{settings.currency} {activeShareLoan?.balance?.toLocaleString() || 0}</h3>
                {activeShareLoan && <p className="text-[10px] font-bold uppercase mt-1 text-rose-500/70">{activeShareLoan.status}</p>}
              </div>
            </div>
          </div>

          {/* Emergency Fund Card */}
          <div className="glass p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden group border border-amber-500/10">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <ShieldAlert className="text-amber-500" /> Emergency Fund
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Total Emergency</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">{settings.currency} {memberEmergency.toLocaleString()}</h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Total Earnings</p>
                <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> {settings.currency} {emergencyEarnings.toLocaleString()}
                </h3>
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-amber-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Applied Loan</p>
                <h3 className="text-2xl font-bold text-amber-500">{settings.currency} {appliedEmergencyLoan?.principal?.toLocaleString() || 0}</h3>
                {appliedEmergencyLoan && <p className="text-[10px] font-bold uppercase mt-1 text-amber-500/70">{appliedEmergencyLoan.status} {appliedEmergencyLoan.isTopUp ? '(TOP UP)' : ''}</p>}
              </div>
              <div className="p-5 bg-secondary/30 rounded-2xl border border-rose-500/10">
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Active Loan</p>
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
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Request Loan</h2>
              <form onSubmit={handleRequestLoan} className="space-y-5">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Fund Type</label>
                  <select required value={newLoan.fundType} onChange={e => setNewLoan({...newLoan, fundType: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary">
                    <option value="SHARE">Share Fund</option>
                    <option value="EMERGENCY">Emergency Fund</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Loan Rule</label>
                  <select required value={newLoan.ruleId} onChange={e => setNewLoan({...newLoan, ruleId: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary">
                    <option value="">Select Range</option>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {activeRules.map((r: any) => <option key={r.id} value={r.id}>{r.minAmount} - {r.maxAmount} ({r.durationMonths}m)</option>)}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Principal ({settings.currency})</label>
                  <input required type="number" value={newLoan.principal} onChange={e => setNewLoan({...newLoan, principal: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary" />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsLoanModalOpen(false)} className="flex-1 py-4 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">Submit Request</button>
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
