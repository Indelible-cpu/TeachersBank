import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, CreditCard, Banknote, Calendar, Lock } from 'lucide-react';
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
  const { isReadOnly } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Record<string, any>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newLoan, setNewLoan] = useState({
    memberId: '',
    principal: '',
    dueDate: ''
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) {
        setLoans(cachedLoans);
      } else if (isMounted) {
        const initial: Loan[] = [
          { id: 'l1', memberId: '1', memberName: 'John Banda', principal: 100000, interestRate: 10, expectedReturn: 110000, balance: 110000, dueDate: '2026-06-20', status: 'APPROVED', timestamp: new Date().toISOString() }
        ];
        setLoans(initial);
        await setSetting('loans', initial);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

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
    
    if (isOnline) {
      // API Call
    } else {
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
          <p className="text-muted-foreground">Manage member loans and track balances.</p>
        </div>
        
        {!isReadOnly ? (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            {t('loans.create_loan')}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-muted-foreground font-medium rounded-xl border border-dashed">
            <Lock className="w-4 h-4" />
            Read Only Access
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loans.map((loan, i) => (
          <motion.div 
            key={loan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors relative overflow-hidden"
          >
            {loan.status === 'FULLY_PAID' && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                PAID
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${loan.balance > 0 ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{loan.memberName}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${loan.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-secondary-foreground'}`}>
                  {loan.status}
                </span>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('loans.principal')}</span>
                <span className="font-semibold text-foreground">MWK {loan.principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('loans.expected_return')} ({loan.interestRate}%)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">MWK {loan.expectedReturn.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="font-medium">{t('loans.balance')}</span>
                <span className="font-bold text-lg text-rose-600 dark:text-rose-400">MWK {loan.balance.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Calendar className="w-3.5 h-3.5" />
                Due: {new Date(loan.dueDate).toLocaleDateString()}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background rounded-3xl p-6 shadow-xl border border-border"
          >
            <h2 className="text-xl font-bold mb-6">{t('loans.create_loan')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('loans.member')}</label>
                <select 
                  required
                  value={newLoan.memberId}
                  onChange={e => setNewLoan({...newLoan, memberId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m) => (
                    <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)} ({String(m.memberNumber)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('loans.principal')}</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newLoan.principal}
                    onChange={e => setNewLoan({...newLoan, principal: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. 100000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('loans.due_date')}</label>
                <input 
                  type="date" 
                  required
                  value={newLoan.dueDate}
                  onChange={e => setNewLoan({...newLoan, dueDate: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium"
                >
                  {t('loans.save')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Loans;
