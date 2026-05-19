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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULLY_PAID';
  timestamp: string;
  shareInterest?: number;    // Interest accumulated from member's share pool (for disbursement reports)
  memberShares?: number;     // Total confirmed shares at time of loan issuance
}

const Loans = () => {
  const { t } = useTranslation();
  const { isOnline, settings } = useSettings();
  const { isReadOnly, canWriteFinance, canConfirm, user } = useAuth();
  const toast = useToast();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectingLoanId, setRejectingLoanId] = useState<string | null>(null);
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
    dueDate: ''
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
    (async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) {
        setLoans(cachedLoans);
      }

      const cachedContribs = await getSetting('contributions') || [];
      if (cachedContribs && isMounted) {
        setContributions(cachedContribs);
      }

      // Background sync to fetch fresh members from the server
      if (navigator.onLine) {
        try {
          const synced = await performSync();
          if (synced && isMounted) {
            const freshMembers = await getSetting('members');
            if (freshMembers) setMembers(freshMembers);
            const freshLoans = await getSetting('loans');
            if (freshLoans) setLoans(freshLoans);
            const freshContribs = await getSetting('contributions');
            if (freshContribs) setContributions(freshContribs);
          }
        } catch (err) {
          console.error('Failed to sync loans', err);
        }
      }
    })();
    return () => { isMounted = false; };
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

    const selectedMember = members.find(m => m.id === newLoan.memberId);
    
    // Calculate total confirmed share contributions for the selected member
    // This is used for the share-disbursement interest (shown in reports per member)
    const memberShares = contributions
      .filter(c => c.memberId === newLoan.memberId && c.type === 'SHARE' && c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const principal = parseFloat(newLoan.principal);
    const interestRate = settings.interestPercentage || 10;
    
    // Loan repayment model: interest on the loan = principal × interestRate%
    // (separate from share-disbursement interest which = memberShares × interestRate%)
    const loanInterestAmount = principal * (interestRate / 100);
    const expectedReturn = principal + loanInterestAmount;

    // Share-pool interest stored for reporting/disbursement purposes
    const shareInterestAmount = memberShares * (interestRate / 100);

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
    setNewLoan({ memberId: '', principal: '', dueDate: '' });
  };

  const handleApproveLoan = async (loanId: string) => {
    if (isReadOnly || !canConfirm) return;
    const updated = loans.map(l => l.id === loanId ? { ...l, status: 'APPROVED' as const } : l);
    setLoans(updated);
    await setSetting('loans', updated);
    
    const loan = updated.find(l => l.id === loanId);
    if (loan) {
      await addToSyncQueue('UPDATE', 'loans', loan);
    }
    toast.success('Loan confirmed and approved successfully');
  };

  const handleRejectLoan = async (loanId: string) => {
    if (isReadOnly || !canConfirm) return;
    setRejectingLoanId(loanId);
  };

  if (user?.role === 'ADMIN') {
    return <div className="p-8 text-center font-black text-rose-500 text-lg">Access Denied: Administrators do not have access to the Loan Management page.</div>;
  }

  const pendingCount = loans.filter(l => l.status === 'PENDING').length;
  const filteredLoans = activeView === 'verify' ? loans.filter(l => l.status === 'PENDING') : loans;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
        {canConfirm && (
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
            {loan.status === 'PENDING' && (
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-semibold px-4 py-1.5 rounded-bl-2xl capitalize tracking-widest animate-pulse">
                Pending Confirmation
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
              <div className="overflow-hidden">
                <h3 className="font-bold text-lg leading-tight truncate">{loan.memberName}</h3>
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
              
              {loan.status === 'PENDING' && canConfirm && (
                <div className="flex gap-2 pt-3 border-t border-border/50 mt-3">
                  <button 
                    onClick={() => handleApproveLoan(loan.id)}
                    className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-emerald-500/10 active:scale-[0.97]"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={() => handleRejectLoan(loan.id)}
                    className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-rose-500/10 active:scale-[0.97]"
                  >
                    Reject
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
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  type="button" 
                  onClick={() => setRejectingLoanId(null)}
                  className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    const updated = loans.map(l => l.id === rejectingLoanId ? { ...l, status: 'REJECTED' as const } : l);
                    setLoans(updated);
                    await setSetting('loans', updated);
                    
                    const loan = updated.find(l => l.id === rejectingLoanId);
                    if (loan) {
                      await addToSyncQueue('UPDATE', 'loans', loan);
                    }
                    toast.success('Loan rejected successfully');
                    setRejectingLoanId(null);
                  }}
                  className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-[1.25rem] font-black hover:bg-destructive/90 transition-all"
                >
                  Yes, Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Loans;
