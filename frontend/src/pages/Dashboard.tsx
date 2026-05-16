import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, ShieldAlert, CheckCircle2, TrendingUp, HandCoins } from 'lucide-react';
import { getSetting } from '../services/db';

interface DashboardStats {
  contributions: number;
  loans: number;
  members: number;
  pendingVerification: number;
  pendingAmount: number;
  accumulatedInterest: number;
}

interface DBRecord {
  amount?: number;
  balance?: number;
  status?: string;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, canConfirm } = useAuth();
  
  const [data, setData] = useState<DashboardStats>({
    contributions: 0,
    loans: 0,
    members: 0,
    pendingVerification: 0,
    pendingAmount: 0,
    accumulatedInterest: 0
  });

  useEffect(() => {
    (async () => {
      const contribs = (await getSetting('contributions') || []) as DBRecord[];
      const loansList = (await getSetting('loans') || []) as Array<{ principal: number; expectedReturn: number; balance: number }>;
      const membersList = await getSetting('members') || [];
      const repaymentsList = (await getSetting('repayments') || []) as DBRecord[];

      const confirmedContribs = contribs.filter((c) => c.status === 'CONFIRMED');
      const pendingContribs = contribs.filter((c) => c.status === 'PENDING');
      const pendingRepayments = repaymentsList.filter((r) => r.status === 'PENDING');

      const accumulatedInterest = loansList.reduce((acc, l) => acc + ((l.expectedReturn || 0) - (l.principal || 0)), 0);

      setData({
        contributions: confirmedContribs.reduce((acc, c) => acc + (c.amount || 0), 0),
        loans: loansList.reduce((acc, l) => acc + (l.balance || 0), 0),
        members: membersList.length,
        pendingVerification: pendingContribs.length + pendingRepayments.length,
        pendingAmount: pendingContribs.reduce((acc, c) => acc + (c.amount || 0), 0) + pendingRepayments.reduce((acc, r) => acc + (r.amount || 0), 0),
        accumulatedInterest
      });
    })();
  }, []);

  const stats = [
    { title: 'Verified Capital', value: `MWK ${data.contributions.toLocaleString()}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Active Loan Book', value: `MWK ${data.loans.toLocaleString()}`, icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Accumulated Interest', value: `MWK ${data.accumulatedInterest.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'In Transit', value: `MWK ${data.pendingAmount.toLocaleString()}`, icon: HandCoins, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground font-medium italic">Welcome back, {user?.name}. Your financial command center is ready.</p>
        </div>
        
        {canConfirm && data.pendingVerification > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 px-6 py-3 bg-amber-500 text-white rounded-[2rem] shadow-xl shadow-amber-500/20"
          >
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold tracking-widest leading-none mb-1 text-amber-100">Attention Treasurer</p>
              <p className="text-sm font-bold">{data.pendingVerification} items awaiting verification</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-8 rounded-[2.5rem] flex flex-col gap-6 hover:scale-[1.03] transition-all cursor-default group"
          >
            <div className={`p-4 rounded-2xl w-fit ${stat.bg} group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground capitalize tracking-widest">{stat.title}</p>
              <h3 className={`text-2xl font-bold ${stat.color} tracking-tight`}>{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass p-10 rounded-[3rem] space-y-8 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary" /> Performance Overview
            </h3>
          </div>
          <div className="h-48 flex items-end gap-4 px-4">
             {/* Mock chart bars */}
             {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
               <div 
                 key={i} 
                 className="flex-1 bg-primary/20 rounded-t-xl relative group transition-all"
               >
                 <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    className="absolute bottom-0 left-0 right-0 bg-primary/40 rounded-t-xl" 
                 />
                 <motion.div 
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    animate={{ height: `${h}%` }}
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl"
                 />
               </div>
             ))}
          </div>
          <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
        </div>

        <div className="glass p-10 rounded-[3rem] space-y-8">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" /> Recent verification
          </h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
               <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
                 <div>
                   <p className="text-sm font-bold">Monthly Share Batch</p>
                   <p className="text-[10px] font-medium text-muted-foreground">Verified by {user?.name}</p>
                 </div>
               </div>
               <span className="text-xs font-black text-emerald-600">+ MWK 450,000</span>
             </div>
             <div className="flex items-center justify-center h-24 border-2 border-dashed border-border/50 rounded-3xl">
               <p className="text-[10px] font-semibold text-muted-foreground tracking-widest opacity-40">System log active</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
