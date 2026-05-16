import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Receipt, HandCoins, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Repayment {
  id: string;
  loanId: string;
  memberName: string;
  amount: number;
  timestamp: string;
}

const Repayments = () => {
  const { t } = useTranslation();
  const { isOnline } = useSettings();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [activeLoans, setActiveLoans] = useState<Record<string, unknown>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newRepayment, setNewRepayment] = useState({
    loanId: '',
    amount: ''
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedLoans = await getSetting('loans');
      if (cachedLoans && isMounted) {
        setActiveLoans(cachedLoans.filter((l: Record<string, unknown>) => (l.balance as number) > 0));
      }
      
      const cachedRepayments = await getSetting('repayments');
      if (cachedRepayments && isMounted) {
        setRepayments(cachedRepayments);
      } else if (isMounted) {
        const initial: Repayment[] = [
          { id: 'r1', loanId: 'l1', memberName: 'John Banda', amount: 20000, timestamp: new Date().toISOString() }
        ];
        setRepayments(initial);
        await setSetting('repayments', initial);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const loan = activeLoans.find(l => l.id === newRepayment.loanId);
    if (!loan) return;
    
    const amount = parseFloat(newRepayment.amount);

    const repayment: Repayment = {
      id: Date.now().toString(),
      loanId: (loan.id as string),
      memberName: (loan.memberName as string),
      amount,
      timestamp: new Date().toISOString()
    };
    
    const updated = [repayment, ...repayments];
    setRepayments(updated);
    await setSetting('repayments', updated);

    const allLoans = await getSetting('loans') || [];
    const updatedLoans = allLoans.map((l: Record<string, unknown>) => {
      if (l.id === loan.id) {
        const newBalance = (l.balance as number) - amount;
        return { 
          ...l, 
          balance: newBalance < 0 ? 0 : newBalance,
          status: newBalance <= 0 ? 'FULLY_PAID' : (l.status as string)
        };
      }
      return l;
    });
    await setSetting('loans', updatedLoans);
    setActiveLoans(updatedLoans.filter((l: Record<string, unknown>) => (l.balance as number) > 0));
    
    if (isOnline) {
      // API Call
    } else {
      await addToSyncQueue('CREATE', 'repayments', repayment);
      await addToSyncQueue('UPDATE', 'loans', { id: (loan.id as string), balance: (loan.balance as number) - amount });
    }
    
    setIsModalOpen(false);
    setNewRepayment({ loanId: '', amount: '' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('repayments.title')}</h1>
          <p className="text-muted-foreground">Record and track loan payments.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t('repayments.record')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('repayments.history')}</h2>
          </div>
          
          <div className="space-y-3">
            {repayments.map((r, i) => (
              <motion.div 
                key={r.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-4 rounded-xl flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <HandCoins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{r.memberName}</h4>
                    <p className="text-xs text-muted-foreground">Loan ID: {r.loanId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">+ MWK {r.amount.toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.timestamp).toLocaleDateString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-semibold mb-4 text-lg">Active Loans Summary</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <p className="text-sm font-medium mb-1">Total Expected Return</p>
                <h4 className="text-2xl font-bold">MWK 110,000</h4>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
                <p className="text-sm font-medium mb-1">Outstanding Balance</p>
                <h4 className="text-2xl font-bold">MWK 90,000</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-background rounded-3xl p-6 shadow-xl border border-border"
          >
            <h2 className="text-xl font-bold mb-6">{t('repayments.record')}</h2>
            
            {activeLoans.length === 0 ? (
              <div className="text-center p-4">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No active loans found.</p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="mt-4 px-4 py-2 bg-secondary rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="loanId" className="block text-sm font-medium mb-1">{t('repayments.loan')}</label>
                  <select 
                    id="loanId"
                    aria-label={t('repayments.loan')}
                    required
                    value={newRepayment.loanId}
                    onChange={e => setNewRepayment({...newRepayment, loanId: e.target.value})}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none"
                  >
                    <option value="">-- Select Active Loan --</option>
                    {activeLoans.map((l) => (
                      <option key={String(l.id)} value={String(l.id)}>{String(l.memberName)} (Bal: MWK {Number(l.balance).toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="repaymentAmount" className="block text-sm font-medium mb-1">{t('repayments.amount')}</label>
                  <div className="relative">
                    <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input 
                      id="repaymentAmount"
                      aria-label={t('repayments.amount')}
                      type="number" 
                      required
                      min="1"
                      value={newRepayment.amount}
                      onChange={e => setNewRepayment({...newRepayment, amount: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g. 20000"
                    />
                  </div>
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
                    {t('repayments.save')}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Repayments;
