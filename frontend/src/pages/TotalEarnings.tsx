import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';

const TotalEarnings = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [members, setMembers] = useState<any[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    (async () => {
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
      
      if (isMounted) setMembers(enrichedMembers);
    })();
    return () => { isMounted = false; };
  }, [settings.interestPercentage]);

  const totalPool = members.reduce((sum, m) => sum + m.totalShares, 0);
  const totalInterest = members.reduce((sum, m) => sum + m.earnedInterest, 0);
  const grandTotal = totalPool + totalInterest;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Total Earnings</h1>
        <p className="text-muted-foreground font-medium italic">Share contributions and accumulated interest per member</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit"><Wallet className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Total Shares Pool</p>
            <h3 className="text-3xl font-bold text-emerald-500">{settings.currency} {totalPool.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl w-fit"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Total Generated Interest</p>
            <h3 className="text-3xl font-bold text-blue-500">{settings.currency} {totalInterest.toLocaleString()}</h3>
          </div>
        </div>

        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl w-fit"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Grand Total Earnings</p>
            <h3 className="text-3xl font-bold text-purple-500">{settings.currency} {grandTotal.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/50 border-b border-border/50">
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">Member Number</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground">Fullname</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">Total Shares</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-muted-foreground text-right">Interest ({settings.interestPercentage}%)</th>
                <th className="p-4 font-bold text-sm tracking-widest uppercase text-emerald-500 text-right">Total Earnings</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m: any, idx: number) => (
                <motion.tr 
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-b border-border/20 hover:bg-primary/5 transition-colors"
                >
                  <td className="p-4 font-bold text-sm">{m.memberNumber}</td>
                  <td className="p-4 font-bold text-sm">{m.fullname}</td>
                  <td className="p-4 font-bold text-sm text-right">{settings.currency} {m.totalShares.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-blue-500">+{settings.currency} {m.earnedInterest.toLocaleString()}</td>
                  <td className="p-4 font-bold text-sm text-right text-emerald-500">{settings.currency} {m.totalEarnings.toLocaleString()}</td>
                </motion.tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground font-bold">No member records found.</td>
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
