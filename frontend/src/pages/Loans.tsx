import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Banknote, Calendar, ShieldAlert, XCircle, History, ShieldCheck } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue, performSync } from '../services/db';
import { useToast } from '../context/useToast';

interface Loan {
  id: string;
  memberId: string;
  memberName: string;
  principal: number;
  interestRate: number;
  expectedReturn: number;
  balance: number;
  dueDate: string;
  status: 'PENDING' | 'VERIFIED' | 'APPROVED' | 'REJECTED' | 'FULLY_PAID';
  fundType?: 'SHARE' | 'EMERGENCY';
  timestamp: string;
  shareInterest?: number;    // Interest accumulated from member's share pool (for disbursement reports)
  memberShares?: number;     // Total confirmed shares at time of loan issuance
  confirmedBy?: string;
  confirmedAt?: string;
  isTopUp?: boolean;
}

const Loans = () => {
  const { t } = useTranslation();
  const { isOnline, settings } = useSettings();
  const { isReadOnly, canWriteFinance, canConfirm, user } = useAuth();
  const toast = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [contributions, setContributions] = useState<Array<{ memberId: string; type: string; status: string; amount: number | string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [grantingLoan, setGrantingLoan] = useState<Loan | null>(null);
  const [grantPrincipal, setGrantPrincipal] = useState<string>('');
  const [activeView, setActiveView] = useState<'history' | 'verify'>('history');
  
  const rules = settings.loanDurationRules || [
    { id: '1', minAmount: 5000, maxAmount: 50000, durationMonths: 3 },
    { id: '2', minAmount: 50001, maxAmount: 100000, durationMonths: 6 },
    { id: '3', minAmount: 100001, maxAmount: 500000, durationMonths: 12 },
    { id: '4', minAmount: 500001, maxAmount: 9999999, durationMonths: 24 }
  ];

  const [selectedRuleId, setSelectedRuleId] = useState('');

  const [newLoan, setNewLoan] = useState({
    memberId: '',
    principal: '',
    dueDate: '',
    fundType: 'SHARE'
  });

  const handleRuleChange = (ruleId: string) => {
    setSelectedRuleId(ruleId);
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      const date = new Date();
      date.setMonth(date.getMonth() + rule.durationMonths);
      setNewLoan(prev => ({
        ...prev,
        dueDate: date.toISOString().split('T')[0]
      }));
    } else {
      setNewLoan(prev => ({
        ...prev,
        dueDate: ''
      }));
    }
  };

  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewLoan(prev => ({
      ...prev,
      principal: value
    }));
  };

  const selectedRule = rules.find(r => r.id === selectedRuleId);
  const principalVal = parseFloat(newLoan.principal) || 0;
  const isPrincipalInvalid = !!(selectedRule && (principalVal < selectedRule.minAmount || principalVal > selectedRule.maxAmount));

  useEffect(() => {
    let isMounted = true;
    const loadLocalData = async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) setLoans(cachedLoans);

      const cachedContribs = await getSetting('contributions') || [];
      if (cachedContribs && isMounted) setContributions(cachedContribs);
    };

    loadLocalData();

    if (navigator.onLine) {
      performSync().catch(err => console.error('Failed to sync loans', err));
    }

    const handleSyncCompleted = () => {
      loadLocalData();
    };
    window.addEventListener('sync-completed', handleSyncCompleted);

    return () => { 
      isMounted = false; 
      window.removeEventListener('sync-completed', handleSyncCompleted);
    };
  }, []);

  // Fail-safe reactive loader when modal is opened
  useEffect(() => {
    if (isModalOpen) {
      (async () => {
        const cachedMembers = await getSetting('members');
        if (cachedMembers) setMembers(cachedMembers);
        const cachedContribs = await getSetting('contributions') || [];
        if (cachedContribs) setContributions(cachedContribs);
      })();
    }
  }, [isModalOpen]);

  const createNotification = async (memberId: string, title: string, message: string) => {
    const member = members.find(m => m.id === memberId) as any;
    if (!member || !member.userId) return;
    const notification = {
      id: Date.now().toString(),
      userId: member.userId,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    await addToSyncQueue('CREATE', 'notifications', notification);
    const currentNotifs = await getSetting('notifications') || [];
    await setSetting('notifications', [notification, ...currentNotifs]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !canWriteFinance) return;

    if (!selectedRuleId) {
      toast.error('Please select a Loan Range / Term limit');
      return;
    }

    if (isPrincipalInvalid) {
      toast.error('Cannot record loan: Principal amount is outside of the selected loan range.');
      return;
    }

    const hasActiveLoan = loans.some((l: any) => l.memberId === newLoan.memberId && ['PENDING', 'VERIFIED', 'APPROVED'].includes(l.status));
    if (hasActiveLoan) {
      toast.error('System Rejected: Member already has an active loan.');
      return;
    }

    const selectedMember = members.find(m => m.id === newLoan.memberId);
    
    // Calculate total confirmed share contributions for the selected member
    // This is used for the share-disbursement interest (shown in reports per member)
    const memberShares = contributions
      .filter(c => c.memberId === newLoan.memberId && c.type === 'SHARE' && c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const principal = parseFloat(newLoan.principal);
    
    const isEmergency = newLoan.fundType === 'EMERGENCY';
    const interestRate = isEmergency 
      ? (settings.emergencyInterestPercentage || 0) 
      : (settings.interestPercentage || 10);
    
    // Loan repayment model: interest on the loan = principal × interestRate%
    // (separate from share-disbursement interest which = memberShares × interestRate%)
    const loanInterestAmount = principal * (interestRate / 100);
    const expectedReturn = principal + loanInterestAmount;

    // Share-pool interest stored for reporting/disbursement purposes
    const shareInterestAmount = memberShares * ((settings.interestPercentage || 10) / 100);

    const loan: Loan = {
      id: Date.now().toString(),
      memberId: newLoan.memberId,
      memberName: (selectedMember?.fullname as string) || 'Unknown',
      principal,
      interestRate,
      expectedReturn,
      balance: expectedReturn,
      shareInterest: shareInterestAmount,
      memberShares,
      dueDate: newLoan.dueDate,
      status: 'PENDING',
      fundType: newLoan.fundType as 'SHARE' | 'EMERGENCY',
      timestamp: new Date().toISOString()
    };
    
    const updated = [loan, ...loans];
    setLoans(updated);
    await setSetting('loans', updated);
    
    if (!isOnline) {
      await addToSyncQueue('CREATE', 'loans', loan);
    } else {
      await addToSyncQueue('CREATE', 'loans', loan);
    }
    
    toast.success('Loan issued and recorded successfully. Pending Treasurer confirmation.');
    setIsModalOpen(false);
    setSelectedRuleId('');
    setNewLoan({ memberId: '', principal: '', dueDate: '', fundType: 'SHARE' });
  };

  const handleVerifyLoan = async (loanId: string) => {
    if (isReadOnly || !canWriteFinance) return;
    const updated = loans.map(l => l.id === loanId ? { ...l, status: 'VERIFIED' as const, confirmedBy: user?.name, confirmedAt: new Date().toISOString() } : l);
    setLoans(updated);
    await setSetting('loans', updated);
    
    const loan = updated.find(l => l.id === loanId);
    if (loan) {
      await addToSyncQueue('UPDATE', 'loans', loan);
      await createNotification(loan.memberId, 'Loan Verified', `Your loan request of ${settings.currency} ${loan.principal.toLocaleString()} has been verified by the Secretary and is pending Treasurer approval.`);
    }
    toast.success('Loan verified successfully');
  };

  const handleInitiateGrant = (loan: Loan) => {
    setGrantingLoan(loan);
    setGrantPrincipal(String(loan.principal));
  };

  const handleFinalGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantingLoan || isReadOnly || !canConfirm) return;
    
    const finalPrincipal = parseFloat(grantPrincipal);
    const loanInterestAmount = finalPrincipal * (grantingLoan.interestRate / 100);
    const expectedReturn = finalPrincipal + loanInterestAmount;
    
    const updated = loans.map(l => l.id === grantingLoan.id ? { 
      ...l, 
      status: 'APPROVED' as const, 
      principal: finalPrincipal,
      expectedReturn,
      balance: expectedReturn,
      confirmedBy: user?.name, 
      confirmedAt: new Date().toISOString() 
    } : l);
    
    setLoans(updated);
    await setSetting('loans', updated);
    
    const loan = updated.find(l => l.id === grantingLoan.id);
    if (loan) {
      await addToSyncQueue('UPDATE', 'loans', loan);
      await createNotification(loan.memberId, 'Loan Granted', `Your loan request has been granted with a principal of ${settings.currency} ${finalPrincipal.toLocaleString()}.`);
    }
    toast.success('Loan granted successfully');
    setGrantingLoan(null);
  };

  const handleRejectLoan = async (loanId: string) => {
    if (isReadOnly || !canWriteFinance) return;
    setRejectingLoanId(loanId);
    setRejectionReason('');
  };

  if (user?.role === 'ADMIN') {
    return <div className="p-8 text-center font-black text-rose-500 text-lg">Access Denied: Administrators do not have access to the Loan Management page.</div>;
  }

  const verificationStatuses = user?.role === 'SECRETARY' ? ['PENDING'] : user?.role === 'TREASURER' ? ['VERIFIED'] : ['PENDING', 'VERIFIED'];
  const pendingCount = loans.filter(l => verificationStatuses.includes(l.status)).length;
  const filteredLoans = activeView === 'verify' ? loans.filter(l => verificationStatuses.includes(l.status)) : loans;

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('loans.title')}</h1>
          <p className="text-muted-foreground font-medium">Official organization loan issuance and tracking.</p>
        </div>
        
        {canWriteFinance && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            {t('loans.create_loan')}
          </button>
        )}
      </div>

      <div className="flex p-1.5 glass rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all ${activeView === 'history' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
        >
          <History className="w-4 h-4" /> All Loans
        </button>
        {(canConfirm || canWriteFinance) && (
          <button 
            onClick={() => setActiveView('verify')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all relative ${activeView === 'verify' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Verification queue
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredLoans.map((loan) => (
          <motion.div 
            key={loan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-[2rem] p-6 flex flex-col gap-4 hover:border-primary/30 transition-all relative overflow-hidden shadow-sm"
          >
            {loan.status === 'FULLY_PAID' && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-semibold px-4 py-1.5 rounded-bl-2xl capitalize tracking-widest">
                Fully paid
              </div>
            )}
            {['PENDING', 'VERIFIED'].includes(loan.status) && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-semibold px-4 py-1.5 rounded-bl-2xl capitalize tracking-widest animate-pulse">
                {loan.status === 'PENDING' ? 'Pending Verification' : 'Pending Grant'}
              </div>
            )}
            {loan.status === 'REJECTED' && (
              <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-semibold px-4 py-1.5 rounded-bl-2xl capitalize tracking-widest">
                Rejected
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${loan.balance > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'} shadow-inner`}>
                <CreditCard className="w-7 h-7" />
              </div>
              <div className="overflow-hidden flex flex-col gap-1 items-start">
                <h3 className="font-bold text-lg leading-tight truncate flex items-center gap-2">
                  {loan.memberName}
                  {loan.isTopUp && (
                    <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-purple-500/20">
                      Top Up
                    </span>
                  )}
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize tracking-widest ${
                  loan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 
                  loan.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' : 
                  loan.status === 'REJECTED' ? 'bg-rose-500/10 text-rose-600' : 
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {loan.status?.toLowerCase() || ''}
                </span>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold capitalize text-[10px] tracking-wider">{t('loans.principal')}</span>
                <span className="font-semibold text-foreground">{settings.currency} {loan.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold capitalize text-[10px] tracking-wider">Loan Interest ({loan.interestRate}%)</span>
                <span className="font-semibold text-rose-500">+{settings.currency} {(loan.principal * (loan.interestRate / 100)).toLocaleString()}</span>
              </div>
              {loan.shareInterest !== undefined && loan.shareInterest > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-semibold capitalize text-[10px] tracking-wider">Share Pool Interest ({loan.interestRate}%)</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{settings.currency} {loan.shareInterest.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground capitalize tracking-widest mb-1">Total To Repay</p>
                <span className="font-semibold text-xl text-rose-600 dark:text-rose-400">{settings.currency} {loan.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-secondary/30 p-2 rounded-xl">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold capitalize tracking-tight">Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
              </div>
              
              {loan.status === 'PENDING' && canWriteFinance && user?.role === 'SECRETARY' && (
                <div className="flex gap-2 pt-3 border-t border-border/50 mt-3">
                  <button 
                    onClick={() => handleVerifyLoan(loan.id)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-[0.97]"
                  >
                    Verify
                  </button>
                  <button 
                    onClick={() => handleRejectLoan(loan.id)}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-500/10 active:scale-[0.97]"
                  >
                    Reject
                  </button>
                </div>
              )}
              {loan.status === 'VERIFIED' && canConfirm && user?.role === 'TREASURER' && (
                <div className="flex gap-2 pt-3 border-t border-border/50 mt-3">
                  <button 
                    onClick={() => handleInitiateGrant(loan)}
                    className="w-full py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.97]"
                  >
                    Grant Loan
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5 max-h-[90vh] overflow-y-auto scrollbar-thin"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold tracking-tight">Issue organization loan</h2>
                <ShieldAlert className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold capitalize tracking-widest text-muted-foreground ml-1" htmlFor="loan-member">Member</label>
                  <select 
                    id="loan-member" title="Select Member" required
                    value={newLoan.memberId}
                    onChange={e => setNewLoan({...newLoan, memberId: e.target.value})}
                    className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                  >
                    <option value="">Choose Member</option>
                    {members.map(m => <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)}</option>)}
                  </select>
                </div>

                {newLoan.memberId && (() => {
                  const memberShares = contributions
                    .filter(c => c.memberId === newLoan.memberId && c.type === 'SHARE' && c.status === 'CONFIRMED')
                    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
                  const interestRate = settings.interestPercentage || 10;
                  const previewPrincipal = parseFloat(newLoan.principal) || 0;
                  // Share-pool interest: accumulated from savings (for disbursement reports)
                  const shareInterest = memberShares * (interestRate / 100);
                  // Loan repayment interest: charged on principal taken
                  const loanInterest = previewPrincipal * (interestRate / 100);
                  const totalRepayable = previewPrincipal + loanInterest;
                  return (
                    <div className="space-y-2">
                      <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 text-xs font-bold space-y-2">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Share Pool (Disbursement Report)</p>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Total Confirmed Shares:</span>
                          <span className="text-foreground">{settings.currency} {memberShares.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span>Share Pool Interest ({interestRate}%):</span>
                          <span className="text-emerald-600 dark:text-emerald-400">+{settings.currency} {shareInterest.toLocaleString()}</span>
                        </div>
                      </div>
                      {previewPrincipal > 0 && (
                        <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 text-xs font-bold space-y-2">
                          <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Loan Repayment Breakdown</p>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Principal:</span>
                            <span className="text-foreground">{settings.currency} {previewPrincipal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Interest on Loan ({interestRate}%):</span>
                            <span className="text-rose-500">+{settings.currency} {loanInterest.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-border/30 pt-2">
                            <span className="text-foreground">Total To Repay:</span>
                            <span className="text-rose-600 dark:text-rose-400 font-black">{settings.currency} {totalRepayable.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <label className="text-xs font-semibold capitalize tracking-widest text-muted-foreground ml-1" htmlFor="loan-fund-type">Fund Type</label>
                  <select 
                    id="loan-fund-type" title="Select Fund Type" required
                    value={newLoan.fundType}
                    onChange={e => setNewLoan({...newLoan, fundType: e.target.value})}
                    className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                  >
                    <option value="SHARE">Share Fund</option>
                    <option value="EMERGENCY">Emergency Fund</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground ml-1" htmlFor="loan-term-range">Select Loan Range & Term</label>
                  <select 
                    id="loan-term-range" required
                    value={selectedRuleId}
                    onChange={e => handleRuleChange(e.target.value)}
                    className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                  >
                    <option value="">Choose Loan Range / Duration</option>
                    {rules.map(r => (
                      <option key={r.id} value={r.id}>
                        {settings.currency} {r.minAmount.toLocaleString()} - {r.maxAmount.toLocaleString()} ({r.durationMonths} Months)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="loan-amount">Principal Amount</label>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-40" />
                    <input 
                      id="loan-amount" type="number" required min="0"
                      value={newLoan.principal}
                      onChange={handlePrincipalChange}
                      className={`w-full pl-12 pr-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 font-black ${isPrincipalInvalid ? 'border border-destructive focus:ring-destructive/10' : 'focus:ring-primary/10'}`}
                      placeholder={selectedRule ? `Range: ${selectedRule.minAmount} - ${selectedRule.maxAmount}` : "0"}
                    />
                  </div>
                  {isPrincipalInvalid && selectedRule && (
                    <p className="text-[10px] text-rose-500 font-bold ml-2">
                      Error: Amount must be between {settings.currency} {selectedRule.minAmount.toLocaleString()} and {settings.currency} {selectedRule.maxAmount.toLocaleString()}!
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground ml-1">Loan Duration & Term Limit</label>
                  <div className="px-5 py-4 bg-secondary/30 rounded-2xl border border-border/50 text-sm font-bold flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs font-semibold">Term Duration:</span>
                      <span className="text-primary">{selectedRule ? `${selectedRule.durationMonths} Months` : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs font-semibold">Automatic Due Date:</span>
                      <span className="text-foreground">{newLoan.dueDate ? new Date(newLoan.dueDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black shadow-xl shadow-primary/20">Issue & Record</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Reject Confirmation Modal */}
        {rejectingLoanId && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setRejectingLoanId(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                  <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">Reject Loan Application</h2>
                <p className="text-muted-foreground text-sm font-semibold">
                  Are you sure you want to reject this loan application? This action will set the loan status to REJECTED.
                </p>
                <div className="text-left mt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Rejection</label>
                  <textarea 
                    required
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason for rejecting this loan..."
                    className="w-full px-5 py-3 mt-2 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  type="button" 
                  onClick={() => { setRejectingLoanId(null); setRejectionReason(''); }}
                  className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    if (!rejectionReason.trim()) {
                      toast.error('Please provide a reason for rejection.');
                      return;
                    }
                    const updated = loans.map(l => l.id === rejectingLoanId ? { ...l, status: 'REJECTED' as const } : l);
                    setLoans(updated);
                    await setSetting('loans', updated);
                    
                    const loan = updated.find(l => l.id === rejectingLoanId);
                    if (loan) {
                      await addToSyncQueue('UPDATE', 'loans', loan);
                      await createNotification(loan.memberId, 'Loan Rejected', `Your loan request was rejected. Reason: ${rejectionReason}`);
                      
                      try {
                        const { default: api } = await import('../services/api');
                        const res = await api.get('/users');
                        const treasurer = res.data.find((u: any) => u.role === 'TREASURER' && u.isActive) || res.data.find((u: any) => u.role === 'TREASURER');
                        if (treasurer) {
                           const notif = {
                             id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                             userId: treasurer.id,
                             title: 'Loan Application Rejected',
                             message: `A loan application for ${loan.memberName} was rejected by the Secretary. Reason: ${rejectionReason}`,
                             isRead: false,
                             createdAt: new Date().toISOString()
                           };
                           await addToSyncQueue('CREATE', 'notifications', notif);
                           const currentNotifs = await getSetting('notifications') || [];
                           await setSetting('notifications', [notif, ...currentNotifs]);
                        }
                      } catch (err) {
                        console.error('Failed to notify treasurer', err);
                      }
                    }
                    toast.success('Loan rejected successfully');
                    setRejectingLoanId(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-[1.25rem] font-black hover:bg-destructive/90 transition-all"
                >
                  Yes, Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Granting Loan Modal */}
        {grantingLoan && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setGrantingLoan(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 tracking-tight flex items-center gap-2">
                <Banknote className="text-primary w-6 h-6" /> Grant Loan
              </h2>
              <p className="text-muted-foreground text-sm font-semibold mb-6">
                Review and finalize the granted principal amount. You may adjust the requested amount below if there are insufficient funds.
              </p>
              
              <form onSubmit={handleFinalGrant} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Granted Principal ({settings.currency})</label>
                  <input 
                    required type="number" min="0" max={grantingLoan.principal}
                    value={grantPrincipal} 
                    onChange={e => setGrantPrincipal(e.target.value)} 
                    className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold focus:ring-2 focus:ring-primary" 
                  />
                  <p className="text-[10px] text-muted-foreground font-semibold ml-1">
                    Requested amount was {settings.currency} {grantingLoan.principal.toLocaleString()}.
                  </p>
                </div>
                
                {grantPrincipal && parseFloat(grantPrincipal) > 0 && (() => {
                  const p = parseFloat(grantPrincipal);
                  const interest = p * (grantingLoan.interestRate / 100);
                  const total = p + interest;
                  return (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-xs font-bold space-y-2">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Adjusted Interest ({grantingLoan.interestRate}%):</span>
                        <span className="text-rose-500">+{settings.currency} {interest.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/30 pt-2">
                        <span className="text-foreground">New Total Repayable:</span>
                        <span className="text-primary font-black">{settings.currency} {total.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setGrantingLoan(null)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all">
                    Finalize Grant
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Loans;
