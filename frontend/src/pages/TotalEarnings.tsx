import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, DollarSign, Search } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';

const TotalEarnings = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const allMembers = await getSetting('members') || [];
    const contribs = await getSetting('contributions') || [];
    const shares = await getSetting('shareContributions') || [];
    const mergedContribs = [...contribs, ...shares].filter((c: any) => c.status === 'CONFIRMED' && c.type === 'SHARE');
    
    const enrichedMembers = allMembers.map((m: any) => {
      const memberShares = mergedContribs
        .filter((c: any) => c.memberId === m.id)
        .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
        
      const interestRate = settings.interestPercentage || 10;
      const memberInterest = memberShares * (interestRate / 100);
      
      return {
        ...m,
        totalShares: memberShares,
        earnedInterest: memberInterest,
        totalEarnings: memberShares + memberInterest
      };
    });
    
    setMembers(enrichedMembers);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    const handleSync = () => loadData();
    window.addEventListener('sync-completed', handleSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-completed', handleSync);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.interestPercentage]);

  const filteredMembers = members.filter(m =>
    m.fullname?.toLowerCase().includes(search.toLowerCase()) ||
    m.memberNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPool = members.reduce((sum, m) => sum + m.totalShares, 0);
  const totalInterest = members.reduce((sum, m) => sum + m.earnedInterest, 0);
  const grandTotal = totalPool + totalInterest;

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 lg:pt-8 pb-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('total_earnings.title', 'Total Earnings')}</h1>
        <p className="text-muted-foreground font-medium italic">{t('total_earnings.subtitle', 'Share contributions and accumulated interest per member')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit"><Wallet className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('total_earnings.total_shares_pool', 'Total Shares Pool')}</p>
            <h3 className="text-3xl font-bold text-emerald-500">{settings.currency} {totalPool.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl w-fit"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('total_earnings.total_generated_interest', 'Total Generated Interest')}</p>
            <h3 className="text-3xl font-bold text-blue-500">{settings.currency} {totalInterest.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl w-fit"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('total_earnings.grand_total', 'Grand Total Earnings')}</p>
            <h3 className="text-3xl font-bold text-purple-500">{settings.currency} {grandTotal.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('total_earnings.search_placeholder', 'Search member by name or number...')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-2 focus:ring-primary font-medium text-sm"
        />
      </div>

      <div className="glass rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border/50">
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">{t('total_earnings.member_number', 'Member Number')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">{t('total_earnings.fullname', 'Fullname')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">{t('total_earnings.total_shares', 'Total Shares')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">{t('total_earnings.interest', 'Interest')} ({settings.interestPercentage}%)</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-emerald-500 text-right">{t('total_earnings.title', 'Total Earnings')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m: any, idx: number) => (
                <motion.tr 
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                >
                  <td className="p-4 font-bold text-sm">{m.memberNumber}</td>
                  <td className="p-4 font-bold text-sm">{m.fullname}</td>
                  <td className="p-4 font-bold text-sm text-right">{settings.currency} {m.totalShares.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-blue-500">+{settings.currency} {m.earnedInterest.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-emerald-500">{settings.currency} {m.totalEarnings.toLocaleString()}</td>
                </motion.tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                    {search ? `${t('total_earnings.no_matches', 'No members matching')} "${search}"` : t('total_earnings.no_records', 'No member records found.')}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TotalEarnings;
