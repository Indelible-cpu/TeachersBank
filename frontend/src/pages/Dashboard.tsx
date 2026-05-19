import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, ShieldAlert, CheckCircle2, TrendingUp, HandCoins } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';

interface DashboardStats {
  contributions: number;
  emergencyContributions: number;
  loans: number;
  members: number;
  pendingVerification: number;
  pendingAmount: number;
  accumulatedInterest: number;
  staffCount: number;
  chartData: { label: string; height: number; amount: number }[];
}

interface DBRecord {
  id?: string;
  amount?: number;
  principal?: number;
  balance?: number;
  status?: string;
  timestamp?: string;
  type?: string;
  confirmedBy?: string;
}

interface Activity {
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  timestamp: string;
  isPositive: boolean;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, canConfirm } = useAuth();
  const { settings } = useSettings();
  
  const [data, setData] = useState<DashboardStats>({
    contributions: 0,
    emergencyContributions: 0,
    loans: 0,
    members: 0,
    pendingVerification: 0,
    pendingAmount: 0,
    accumulatedInterest: 0,
    staffCount: 0,
    chartData: []
  });

  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    (async () => {
      const contribs = (await getSetting('contributions') || []) as DBRecord[];
      const loansList = (await getSetting('loans') || []) as Array<{ principal: number; expectedReturn: number; balance: number; status?: string; id?: string; timestamp?: string; confirmedBy?: string }>;
      const membersList = await getSetting('members') || [];
      const repaymentsList = (await getSetting('repayments') || []) as DBRecord[];
      const staffCount = await getSetting('staffCount') || 0;

      const confirmedShares = contribs.filter((c) => c.status === 'CONFIRMED' && c.type === 'SHARE');
      const confirmedEmergency = contribs.filter((c) => c.status === 'CONFIRMED' && c.type === 'EMERGENCY');
      const pendingContribs = contribs.filter((c) => c.status === 'PENDING');
      const pendingRepayments = repaymentsList.filter((r) => r.status === 'PENDING');

      const accumulatedInterest = loansList.reduce((acc, l) => acc + ((l.expectedReturn || 0) - (l.principal || 0)), 0);

      const confirmedContribs = contribs.filter((c) => c.status === 'CONFIRMED');

      const last6Months = Array.from({length: 6}, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        return {
          month: d.getMonth() + 1,
          year: d.getFullYear(),
          label: d.toLocaleString('default', { month: 'short' })
        };
      });

      const chartAmounts = last6Months.map(m => {
        return confirmedContribs.filter(c => {
          if (c.timestamp) {
            const date = new Date(c.timestamp);
            return date.getMonth() + 1 === m.month && date.getFullYear() === m.year;
          }
          return false;
        }).reduce((acc, c) => acc + (c.amount || 0), 0);
      });
      const maxAmount = Math.max(...chartAmounts, 1);
      const chartData = chartAmounts.map((amount, i) => ({
        label: last6Months[i].label,
        height: Math.max(5, Math.round((amount / maxAmount) * 100)),
        amount
      }));

      setData({
        contributions: confirmedShares.reduce((acc, c) => acc + (c.amount || 0), 0),
        emergencyContributions: confirmedEmergency.reduce((acc, c) => acc + (c.amount || 0), 0),
        loans: loansList.reduce((acc, l) => acc + (l.balance || 0), 0),
        members: membersList.length,
        pendingVerification: pendingContribs.length + pendingRepayments.length,
        pendingAmount: pendingContribs.reduce((acc, c) => acc + (c.amount || 0), 0) + pendingRepayments.reduce((acc, r) => acc + (r.amount || 0), 0),
        accumulatedInterest,
        staffCount,
        chartData
      });

      const activities: Activity[] = [];
      
      const confirmedContribs = contribs.filter((c) => c.status === 'CONFIRMED');
      confirmedContribs.forEach(c => {
        activities.push({
          id: c.id || Math.random().toString(),
          title: c.type === 'EMERGENCY' ? t('dashboard_stats.emergency_contrib') : t('dashboard_stats.share_contrib'),
          subtitle: c.confirmedBy ? `Verified by ${c.confirmedBy}` : t('dashboard_stats.system_verified'),
          amount: c.amount || 0,
          timestamp: c.timestamp || new Date(0).toISOString(),
          isPositive: true
        });
      });

      const confirmedRepayments = repaymentsList.filter((r) => r.status === 'CONFIRMED');
      confirmedRepayments.forEach(r => {
        activities.push({
          id: r.id || Math.random().toString(),
          title: t('dashboard_stats.loan_repayment'),
          subtitle: r.confirmedBy ? `Verified by ${r.confirmedBy}` : t('dashboard_stats.system_verified'),
          amount: r.amount || 0,
          timestamp: r.timestamp || new Date(0).toISOString(),
          isPositive: true
        });
      });

      const approvedLoans = loansList.filter((l) => l.status === 'APPROVED');
      approvedLoans.forEach((l) => {
        activities.push({
          id: l.id || Math.random().toString(),
          title: t('dashboard_stats.loan_disbursement'),
          subtitle: l.confirmedBy ? `Approved by ${l.confirmedBy}` : t('dashboard_stats.system_verified'),
          amount: l.principal || 0,
          timestamp: l.timestamp || new Date(0).toISOString(),
          isPositive: false
        });
      });

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 3)); // Keep top 3

    })();
  }, [t]);

  const stats = [
    { title: t('dashboard_stats.verified_capital'), value: `${settings.currency} ${data.contributions.toLocaleString()}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: t('dashboard_stats.verified_emergency'), value: `${settings.currency} ${data.emergencyContributions.toLocaleString()}`, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: t('dashboard_stats.active_loan_book'), value: `${settings.currency} ${data.loans.toLocaleString()}`, icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: t('dashboard_stats.accumulated_interest'), value: `${settings.currency} ${data.accumulatedInterest.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: t('dashboard_stats.in_transit'), value: `${settings.currency} ${data.pendingAmount.toLocaleString()}`, icon: HandCoins, color: 'text-amber-500', bg: 'bg-amber-500/10' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground font-medium italic">{t('dashboard_stats.welcome_back')}{user?.name}{t('dashboard_stats.command_center_ready')}</p>
        </div>
        
        {canConfirm && data.pendingVerification > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 px-6 py-3 bg-amber-500 text-white rounded-[2rem] shadow-xl shadow-amber-500/20"
          >
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold tracking-widest leading-none mb-1 text-amber-100">{t('dashboard_stats.attention_treasurer')}</p>
              <p className="text-sm font-bold">{data.pendingVerification} {t('dashboard_stats.awaiting_verification')}</p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
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
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-3">
              <TrendingUp className="text-primary" /> {t('dashboard_stats.performance_overview')}
            </h3>
          </div>
          <div className="h-48 flex items-end gap-4 px-4">
             {/* Monthly performance bars */}
             {data.chartData.map((d, i) => (
               <div 
                 key={i} 
                 className="flex-1 bg-primary/20 rounded-t-xl relative group transition-all"
                 title={`${d.label}: ${settings.currency} ${d.amount.toLocaleString()}`}
               >
                 <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${d.height}%` }}
                    transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    className="absolute bottom-0 left-0 right-0 bg-primary/40 rounded-t-xl" 
                 />
                 <motion.div 
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    animate={{ height: `${d.height}%` }}
                    className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl"
                 />
               </div>
             ))}
          </div>
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground capitalize tracking-widest px-2">
            {data.chartData.map((d, i) => (
              <span key={i}>{d.label}</span>
            ))}
          </div>
        </div>

        <div className="glass p-10 rounded-[3rem] space-y-8">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-3">
            <CheckCircle2 className="text-emerald-500" /> {t('dashboard_stats.recent_verifications')}
          </h3>
          <div className="space-y-4">
             {recentActivities.length > 0 ? recentActivities.map(activity => (
               <div key={activity.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-transparent hover:border-emerald-500/20 transition-all">
                 <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                     <CheckCircle2 className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-sm font-bold">{activity.title}</p>
                     <p className="text-[10px] font-medium text-muted-foreground">{activity.subtitle}</p>
                   </div>
                 </div>
                 <span className={`text-xs font-bold ${activity.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {activity.isPositive ? '+' : '-'}{settings.currency} {activity.amount.toLocaleString()}
                 </span>
               </div>
             )) : (
               <div className="flex items-center justify-center h-24 border-2 border-dashed border-border/50 rounded-3xl">
                 <p className="text-[10px] font-semibold text-muted-foreground tracking-widest opacity-40">{t('dashboard_stats.no_recent_activity')}</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
