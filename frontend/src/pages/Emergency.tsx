import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, TrendingUp, DollarSign, Search } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';

const Emergency = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    const allMembers = await getSetting('members') || [];
    const contribs = await getSetting('contributions') || [];
    const emergency = await getSetting('emergencyContributions') || [];
    const mergedContribs = [...contribs, ...emergency].filter((c: any) => c.status === 'CONFIRMED' && c.type === 'EMERGENCY');
    
    const enrichedMembers = allMembers.map((m: any) => {
      const memberEmergency = mergedContribs
        .filter((c: any) => c.memberId === m.id)
        .reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0);
        
      const emergencyInterestRate = settings.emergencyInterestPercentage || 0;
      const memberInterest = memberEmergency * (emergencyInterestRate / 100);
      
      return {
        ...m,
        totalEmergency: memberEmergency,
        earnedInterest: memberInterest,
        totalEarnings: memberEmergency + memberInterest
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
  }, [settings.emergencyInterestPercentage]);

  const filteredMembers = members.filter(m =>
    m.fullname?.toLowerCase().includes(search.toLowerCase()) ||
    m.memberNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPool = members.reduce((sum, m) => sum + m.totalEmergency, 0);
  const totalInterest = members.reduce((sum, m) => sum + m.earnedInterest, 0);
  const grandTotal = totalPool + totalInterest;
  const emergencyInterestRate = settings.emergencyInterestPercentage || 0;

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('emergency.title', 'Emergency Fund & Earnings')}</h1>
        <p className="text-muted-foreground font-medium italic">{t('emergency.subtitle', 'Emergency contributions and accumulated interest per member')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl w-fit"><ShieldAlert className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('emergency.total_emergency_pool', 'Total Emergency Pool')}</p>
            <h3 className="text-3xl font-bold text-rose-500">{settings.currency} {totalPool.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl w-fit"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('emergency.total_generated_interest', 'Total Generated Interest')}</p>
            <h3 className="text-3xl font-bold text-amber-500">{settings.currency} {totalInterest.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">{t('emergency.grand_total', 'Grand Total Earnings')}</p>
            <h3 className="text-3xl font-bold text-emerald-500">{settings.currency} {grandTotal.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('emergency.search_placeholder', 'Search member by name or number...')}
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
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">{t('emergency.member_number', 'Member Number')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">{t('emergency.fullname', 'Fullname')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">{t('emergency.total_emergency', 'Total Emergency')}</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">{t('emergency.interest', 'Interest')} ({emergencyInterestRate}%)</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-emerald-500 text-right">{t('emergency.total_earnings', 'Total Earnings')}</th>
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
                  <td className="p-4 font-bold text-sm text-right">{settings.currency} {m.totalEmergency.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-amber-500">+{settings.currency} {m.earnedInterest.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-emerald-500">{settings.currency} {m.totalEarnings.toLocaleString()}</td>
                </motion.tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">
                    {search ? `${t('emergency.no_matches', 'No members matching')} "${search}"` : t('emergency.no_records', 'No member records found.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Emergency;
