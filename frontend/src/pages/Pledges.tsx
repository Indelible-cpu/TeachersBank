import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { getSetting } from '../services/db';
import { Calendar, User, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

const Pledges = () => {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [pledges, setPledges] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [filterMonth, setFilterMonth] = useState(currentMonth);
  const [filterYear, setFilterYear] = useState(currentYear);

  const loadData = async () => {
    const loadedMembers = await getSetting('members') || [];
    setMembers(loadedMembers);
    const loadedPledges = await getSetting('pledges') || [];
    setPledges(loadedPledges);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredPledges = pledges.filter(p => p.month === filterMonth && p.year === filterYear);

  const totalSharePledges = filteredPledges.reduce((sum, p) => sum + (Number(p.shareAmount) || 0), 0);
  const totalLoanRepaymentPledges = filteredPledges.reduce((sum, p) => sum + (Number(p.loanRepaymentAmount) || 0), 0);
  const grandTotal = totalSharePledges + totalLoanRepaymentPledges;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Member Pledges</h1>
          <p className="text-muted-foreground font-medium italic">View advanced declarations of upcoming contributions.</p>
        </div>
        <div className="flex gap-4">
          <select 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="px-4 py-2 bg-secondary/50 rounded-xl outline-none font-bold"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Month {m}</option>
            ))}
          </select>
          <input 
            type="number" 
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="w-24 px-4 py-2 bg-secondary/50 rounded-xl outline-none font-bold text-center"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 rounded-[2rem] flex items-center gap-4 border border-primary/10">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><Wallet className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expected Shares</p>
            <h3 className="text-2xl font-bold">{settings.currency} {totalSharePledges.toLocaleString()}</h3>
          </div>
        </div>
        <div className="glass p-6 rounded-[2rem] flex items-center gap-4 border border-blue-500/10">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Wallet className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Expected Repayments</p>
            <h3 className="text-2xl font-bold">{settings.currency} {totalLoanRepaymentPledges.toLocaleString()}</h3>
          </div>
        </div>
        <div className="glass p-6 rounded-[2rem] flex items-center gap-4 border border-emerald-500/10">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Calendar className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Forecast</p>
            <h3 className="text-2xl font-bold text-emerald-500">{settings.currency} {grandTotal.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                <th className="p-5 pl-8">Member</th>
                <th className="p-5">Expected Share</th>
                <th className="p-5">Expected Loan Repayment</th>
                <th className="p-5 pr-8 text-right">Total Expected</th>
              </tr>
            </thead>
            <tbody>
              {filteredPledges.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground font-semibold">
                    No pledges recorded for this period.
                  </td>
                </tr>
              ) : (
                filteredPledges.map(p => {
                  const m = members.find(m => m.id === p.memberId);
                  const s = Number(p.shareAmount) || 0;
                  const l = Number(p.loanRepaymentAmount) || 0;
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border/50 last:border-0 hover:bg-secondary/10 transition-colors">
                      <td className="p-5 pl-8 font-bold flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><User className="w-4 h-4" /></div>
                        {m?.fullname || 'Unknown Member'}
                      </td>
                      <td className="p-5 font-semibold">{settings.currency} {s.toLocaleString()}</td>
                      <td className="p-5 font-semibold">{settings.currency} {l.toLocaleString()}</td>
                      <td className="p-5 pr-8 text-right font-black text-emerald-500">{settings.currency} {(s + l).toLocaleString()}</td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Pledges;
