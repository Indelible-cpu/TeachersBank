import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, HandCoins, AlertCircle, Lock, ShieldCheck, CheckCircle2, History, ShieldAlert } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Repayment {
  id: string;
  loanId: string;
  memberName: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  timestamp: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

const Repayments = () => {
  const { t } = useTranslation();
  const { isOnline } = useSettings();
  const { isReadOnly, canConfirm, canWriteFinance, user } = useAuth();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [activeLoans, setActiveLoans] = useState<Record<string, any>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'history' | 'verify'>('history');
  
  const [newRepayment, setNewRepayment] = useState({
    loanId: '',
    amount: ''
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) {
        setActiveLoans(cachedLoans.filter((l: any) => (l.balance as number) > 0));
      }
      
      const cachedRepayments = await getSetting('repayments');
      if (cachedRepayments && isMounted) {
        setRepayments(cachedRepayments);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !canWriteFinance) return;

    const loan = activeLoans.find(l => l.id === newRepayment.loanId);
    if (!loan) return;
    
    const amount = parseFloat(newRepayment.amount);

    const repayment: Repayment = {
      id: `R-${Date.now()}`,
      loanId: (loan.id as string),
      memberName: (loan.memberName as string),
      amount,
      status: 'PENDING',
      timestamp: new Date().toISOString()
    };
    
    const updated = [repayment, ...repayments];
    setRepayments(updated);
    await setSetting('repayments', updated);
    
    if (!isOnline) {
      await addToSyncQueue('CREATE', 'repayments', repayment);
    }
    
    setIsModalOpen(false);
    setNewRepayment({ loanId: '', amount: '' });
  };

  const handleVerify = async (id: string) => {
    if (!canConfirm) return;
    const repayment = repayments.find(r => r.id === id);
    if (!repayment) return;

    // Update repayment status
    const updatedRepayments = repayments.map(r => 
      r.id === id ? { ...r, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString(), confirmedBy: user?.name } : r
    );
    setRepayments(updatedRepayments);
    await setSetting('repayments', updatedRepayments);

    // Officially deduct from loan balance ONLY AFTER confirmation
    const allLoans = await getSetting('loans') || [];
    const updatedLoans = allLoans.map((l: any) => {
      if (l.id === repayment.loanId) {
        const newBalance = (l.balance as number) - repayment.amount;
        return { 
          ...l, 
          balance: newBalance < 0 ? 0 : newBalance,
          status: newBalance <= 0 ? 'FULLY_PAID' : l.status
        };
      }
      return l;
    });
    await setSetting('loans', updatedLoans);
    setActiveLoans(updatedLoans.filter((l: any) => (l.balance as number) > 0));
  };

  const pendingCount = repayments.filter(r => r.status === 'PENDING').length;
  const filteredRepayments = activeView === 'verify' ? repayments.filter(r => r.status === 'PENDING') : repayments;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('repayments.title')}</h1>
          <p className="text-muted-foreground font-medium italic">Loan recovery and verification ledger.</p>
        </div>
        
        {canWriteFinance && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-[1.02] shadow-xl shadow-primary/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            {t('repayments.record')}
          </button>
        )}


      </div>

      <div className="flex p-1.5 glass rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all ${activeView === 'history' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
        >
          <History className="w-4 h-4" /> Collection History
        </button>
        {canConfirm && (
          <button 
            onClick={() => setActiveView('verify')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all relative ${activeView === 'verify' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Receipt Verification
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2 mb-4">
            {activeView === 'verify' ? <ShieldAlert className="text-rose-500" /> : <Receipt className="text-primary" />}
            {activeView === 'verify' ? 'Verify Collections' : 'Repayment Log'}
          </h2>
          
          <div className="space-y-3">
            {filteredRepayments.map((r, i) => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 rounded-[2rem] flex items-center justify-between hover:border-primary/30 transition-all border border-transparent shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <HandCoins className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {r.memberName}
                      <span className={`text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full border ${r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                        {r.status.toLowerCase()}
                      </span>
                    </h4>
                    <p className="text-[10px] font-semibold text-muted-foreground capitalize tracking-tighter opacity-60">Loan ref: {r.loanId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl">+ MWK {r.amount.toLocaleString()}</span>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">{new Date(r.timestamp).toLocaleDateString()}</p>
                  </div>
                  {canConfirm && r.status === 'PENDING' && (
                    <button 
                      onClick={() => handleVerify(r.id)}
                      className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                      title="Verify Receipt"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2.5rem] border border-emerald-500/10 bg-emerald-500/5">
            <h3 className="font-black text-emerald-600 text-sm mb-4 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Treasurer Dashboard</h3>
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-background border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground capitalize tracking-widest mb-1">Total confirmed recovery</p>
                <h4 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                  MWK {repayments.filter(r => r.status === 'CONFIRMED').reduce((acc, r) => acc + r.amount, 0).toLocaleString()}
                </h4>
              </div>
              <div className="p-5 rounded-3xl bg-background border border-border">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Pending Verification</p>
                <h4 className="text-2xl font-black text-amber-600">
                  MWK {repayments.filter(r => r.status === 'PENDING').reduce((acc, r) => acc + r.amount, 0).toLocaleString()}
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-black mb-8">{t('repayments.record')}</h2>
              
              {activeLoans.length === 0 ? (
                <div className="text-center p-6 space-y-4">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto opacity-20" />
                  <p className="text-muted-foreground font-bold">No active loans awaiting repayment.</p>
                  <button onClick={() => setIsModalOpen(false)} className="w-full py-4 bg-secondary rounded-2xl font-black uppercase tracking-widest">Close</button>
                </div>
              ) : (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1" htmlFor="loanId">Select Loan</label>
                    <select 
                      id="loanId" title="Select Loan" required
                      value={newRepayment.loanId}
                      onChange={e => setNewRepayment({...newRepayment, loanId: e.target.value})}
                      className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    >
                      <option value="">-- Choose Member Loan --</option>
                      {activeLoans.map(l => (
                        <option key={String(l.id)} value={String(l.id)}>{l.memberName} (Bal: MWK {l.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1" htmlFor="amount">Repayment Amount</label>
                    <div className="relative">
                      <HandCoins className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-40" />
                      <input 
                        id="amount" type="number" required min="1"
                        value={newRepayment.amount}
                        onChange={e => setNewRepayment({...newRepayment, amount: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 font-black"
                        placeholder="Amount in MWK"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black uppercase tracking-widest">Cancel</button>
                    <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20">Submit for Verification</button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Repayments;
