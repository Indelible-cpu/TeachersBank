import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Wallet, HeartPulse, History } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  type: 'SHARE' | 'EMERGENCY';
  amount: number;
  month: string;
  year: string;
  timestamp: string;
}

const Contributions = () => {
  const { t } = useTranslation();
  const { isOnline } = useSettings();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const currentYear = new Date().getFullYear().toString();
  
  const [newContrib, setNewContrib] = useState({
    memberId: '',
    memberName: '',
    type: 'SHARE' as 'SHARE' | 'EMERGENCY',
    amount: '',
    month: currentMonth,
    year: currentYear
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedContribs = await getSetting('contributions');
      if (cachedContribs && isMounted) {
        setContributions(cachedContribs);
      } else if (isMounted) {
        const initial: Contribution[] = [
          { id: 'c1', memberId: '1', memberName: 'John Banda', type: 'SHARE', amount: 50000, month: currentMonth, year: currentYear, timestamp: new Date().toISOString() },
          { id: 'c2', memberId: '2', memberName: 'Mary Phiri', type: 'EMERGENCY', amount: 5000, month: currentMonth, year: currentYear, timestamp: new Date().toISOString() }
        ];
        setContributions(initial);
        await setSetting('contributions', initial);
      }
    })();
    return () => { isMounted = false; };
  }, [currentMonth, currentYear]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedMember = members.find(m => m.id === newContrib.memberId);
    
    const contribution: Contribution = {
      id: Date.now().toString(),
      memberId: newContrib.memberId,
      memberName: (selectedMember?.fullname as string) || 'Unknown',
      type: newContrib.type,
      amount: parseFloat(newContrib.amount),
      month: newContrib.month,
      year: newContrib.year,
      timestamp: new Date().toISOString()
    };
    
    const updated = [contribution, ...contributions];
    setContributions(updated);
    await setSetting('contributions', updated);
    
    if (isOnline) {
      // API Call
    } else {
      await addToSyncQueue('CREATE', 'contributions', contribution);
    }
    
    setIsModalOpen(false);
    setNewContrib({ ...newContrib, amount: '' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('contributions.title')}</h1>
          <p className="text-muted-foreground">Manage and track member contributions.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-all"
        >
          <Plus className="w-5 h-5" />
          {t('contributions.record_new')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('contributions.history')}</h2>
          </div>
          
          <div className="space-y-3">
            {contributions.map((c, i) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass p-4 rounded-xl flex items-center justify-between hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${c.type === 'SHARE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {c.type === 'SHARE' ? <Wallet className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold">{c.memberName}</h4>
                    <p className="text-xs text-muted-foreground">{c.type === 'SHARE' ? t('contributions.share') : t('contributions.emergency')} • {c.month} {c.year}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">MWK {c.amount.toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground">{new Date(c.timestamp).toLocaleDateString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass p-6 rounded-2xl">
            <h3 className="font-semibold mb-4 text-lg">Summary</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <p className="text-sm font-medium mb-1">Total Shares (This Month)</p>
                <h4 className="text-2xl font-bold">MWK 50,000</h4>
              </div>
              <div className="p-4 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400">
                <p className="text-sm font-medium mb-1">Total Emergency (This Month)</p>
                <h4 className="text-2xl font-bold">MWK 5,000</h4>
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
            <h2 className="text-xl font-bold mb-6">{t('contributions.record_new')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label htmlFor="memberId" className="block text-sm font-medium mb-1">{t('contributions.member')}</label>
                <select 
                  id="memberId"
                  aria-label={t('contributions.member')}
                  required
                  value={newContrib.memberId}
                  onChange={e => setNewContrib({...newContrib, memberId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none"
                >
                  <option value="">-- Select Member --</option>
                  {members.map((m) => (
                    <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)} ({String(m.memberNumber)})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">{t('contributions.type')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewContrib({...newContrib, type: 'SHARE'})}
                    className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${newContrib.type === 'SHARE' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-transparent bg-secondary'}`}
                  >
                    {t('contributions.share')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewContrib({...newContrib, type: 'EMERGENCY'})}
                    className={`py-2 rounded-xl text-sm font-medium border-2 transition-all ${newContrib.type === 'EMERGENCY' ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-transparent bg-secondary'}`}
                  >
                    {t('contributions.emergency')}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="contribAmount" className="block text-sm font-medium mb-1">{t('contributions.amount')}</label>
                <input 
                  id="contribAmount"
                  aria-label={t('contributions.amount')}
                  type="number" 
                  required
                  min="0"
                  value={newContrib.amount}
                  onChange={e => setNewContrib({...newContrib, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contribMonth" className="block text-sm font-medium mb-1">{t('contributions.month')}</label>
                  <input 
                    id="contribMonth"
                    aria-label={t('contributions.month')}
                    type="text" 
                    value={newContrib.month}
                    onChange={e => setNewContrib({...newContrib, month: e.target.value})}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="contribYear" className="block text-sm font-medium mb-1">{t('contributions.year')}</label>
                  <input 
                    id="contribYear"
                    aria-label={t('contributions.year')}
                    type="text" 
                    value={newContrib.year}
                    onChange={e => setNewContrib({...newContrib, year: e.target.value})}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
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
                  {t('contributions.save')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Contributions;
