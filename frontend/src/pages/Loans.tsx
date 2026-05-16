import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, Banknote, Calendar, Lock, ShieldAlert } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

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
}

const Loans = () => {
  const { t } = useTranslation();
  const { isOnline, settings } = useSettings();
  const { isReadOnly, canWriteFinance } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newLoan, setNewLoan] = useState({
    memberId: '',
    principal: '',
    dueDate: ''
  });

  const handlePrincipalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = parseFloat(value) || 0;
    
    const thresholdAmount = settings.loanDurationThresholdAmount || 50000;
    const monthsPerThreshold = settings.loanDurationMonthsPerThreshold || 1;
    
    // Calculate months (minimum 1 base threshold worth of months)
    const calculatedMonths = Math.max(1, Math.ceil(amount / thresholdAmount)) * monthsPerThreshold;
    
    const date = new Date();
    date.setMonth(date.getMonth() + calculatedMonths);
    
    setNewLoan({
      ...newLoan,
      principal: value,
      dueDate: amount > 0 ? date.toISOString().split('T')[0] : ''
    });
  };

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) {
        setLoans(cachedLoans);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !canWriteFinance) return;

    const selectedMember = members.find(m => m.id === newLoan.memberId);
    
    const principal = parseFloat(newLoan.principal);
    const interestRate = settings.interestPercentage || 10;
    const expectedReturn = principal + (principal * (interestRate / 100));

    const loan: Loan = {
      id: Date.now().toString(),
      memberId: newLoan.memberId,
      memberName: (selectedMember?.fullname as string) || 'Unknown',
      principal,
      interestRate,
      expectedReturn,
      balance: expectedReturn,
      dueDate: newLoan.dueDate,
      status: 'APPROVED',
      timestamp: new Date().toISOString()
    };
    
    const updated = [loan, ...loans];
    setLoans(updated);
    await setSetting('loans', updated);
    
    if (!isOnline) {
      await addToSyncQueue('CREATE', 'loans', loan);
    }
    
    setIsModalOpen(false);
    setNewLoan({ memberId: '', principal: '', dueDate: '' });
  };

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loans.map((loan) => (
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
            
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl ${loan.balance > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'} shadow-inner`}>
                <CreditCard className="w-7 h-7" />
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-lg leading-tight truncate">{loan.memberName}</h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize tracking-widest ${loan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-secondary-foreground'}`}>
                  {loan.status.toLowerCase()}
                </span>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold capitalize text-[10px] tracking-wider">{t('loans.principal')}</span>
                <span className="font-semibold text-foreground">MWK {loan.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-semibold capitalize text-[10px] tracking-wider">Interest Pool ({loan.interestRate}%)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">MWK {(loan.expectedReturn - loan.principal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground capitalize tracking-widest mb-1">Return Balance</p>
                <span className="font-semibold text-xl text-rose-600 dark:text-rose-400">MWK {loan.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 bg-secondary/30 p-2 rounded-xl">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-semibold capitalize tracking-tight">Due: {new Date(loan.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">Issue Organization Loan</h2>
                <ShieldAlert className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="loan-member">Member</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="loan-amount">Principal Amount</label>
                  <div className="relative">
                    <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-40" />
                    <input 
                      id="loan-amount" type="number" required min="0"
                      value={newLoan.principal}
                      onChange={handlePrincipalChange}
                      className="w-full pl-12 pr-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="loan-due">Due Date</label>
                  <input 
                    id="loan-due" type="date" required
                    value={newLoan.dueDate}
                    onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})}
                    className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20">Issue & Record</button>
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
