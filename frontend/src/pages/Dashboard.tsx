import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, ShieldAlert, CheckCircle2, TrendingUp, HandCoins, Receipt, Clock } from 'lucide-react';
import { getSetting, pullFromServer } from '../services/db';
import { useSettings } from '../context/useSettings';


interface DashboardStats {
  contributions: number;
  emergencyContributions: number;
  loans: number;
  requestedLoans: number;
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
    requestedLoans: 0,
    members: 0,
    pendingVerification: 0,
    pendingAmount: 0,
    accumulatedInterest: 0,
    staffCount: 0,

    chartData: []
  });

  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [pendingLoanRequests, setPendingLoanRequests] = useState<any[]>([]);

  const loadData = async () => {
    const contribs = (await getSetting('contributions') || []) as DBRecord[];
    const loansList = (await getSetting('loans') || []) as Array<{ principal: number; expectedReturn: number; balance: number; status?: string; id?: string; timestamp?: string; confirmedBy?: string }>;
    const membersList = await getSetting('members') || [];
    const repaymentsList = (await getSetting('repayments') || []) as DBRecord[];

    const staffCount = await getSetting('staffCount') || 0;

    const confirmedShares = contribs.filter((c) => c.status === 'CONFIRMED' && c.type === 'SHARE');
    const confirmedEmergency = contribs.filter((c) => c.status === 'CONFIRMED' && c.type === 'EMERGENCY');
    const confirmedContribs = contribs.filter((c) => c.status === 'CONFIRMED');
    const pendingContribs = contribs.filter((c) => c.status === 'PENDING');
    const pendingRepayments = repaymentsList.filter((r) => r.status === 'PENDING');
    
    const activeLoansList = loansList.filter((l) => l.status === 'APPROVED');
    const pendingLoansList = loansList
      .filter((l) => ['PENDING', 'VERIFIED'].includes(l.status as string))
      .map((l: any) => {
        const member = membersList.find((m: any) => m.id === l.memberId);
        return {
          ...l,
          memberName: member?.fullname || 'Unknown',
          timestamp: l.timestamp || l.createdAt,
          isTopUp: l.isTopUp
        };
      });
    
    const accumulatedInterest = activeLoansList.reduce((acc, l) => acc + ((l.expectedReturn || 0) - (l.principal || 0)), 0);

    const last6Months = Array.from({length: 6}, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return { month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleString('default', { month: 'short' }) };
    });
    const firstMonthDate = new Date();
    firstMonthDate.setMonth(firstMonthDate.getMonth() - 5);
    firstMonthDate.setDate(1);
    firstMonthDate.setHours(0, 0, 0, 0);
    
    let runningTotal = confirmedContribs.filter(c => {
      return c.timestamp && new Date(c.timestamp).getTime() < firstMonthDate.getTime();
    }).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);

    const chartAmounts = last6Months.map(m => {
      const monthTotal = confirmedContribs.filter(c => {
        if (c.timestamp) { const date = new Date(c.timestamp); return date.getMonth() + 1 === m.month && date.getFullYear() === m.year; }
        return false;
      }).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
      runningTotal += monthTotal;
      return runningTotal;
    });
    const maxAmount = Math.max(...chartAmounts, 1);
    const chartData = chartAmounts.map((amount, i) => ({ label: last6Months[i].label, height: Math.max(5, Math.round((amount / maxAmount) * 100)), amount }));

    setData({
      contributions: confirmedShares.reduce((acc, c) => acc + (Number(c.amount) || 0), 0),
      emergencyContributions: confirmedEmergency.reduce((acc, c) => acc + (Number(c.amount) || 0), 0),
      loans: activeLoansList.reduce((acc, l) => acc + (Number(l.balance) || 0), 0),
      requestedLoans: pendingLoansList.reduce((acc, l) => acc + (Number(l.principal) || 0), 0),
      members: membersList.length,
      pendingVerification: pendingContribs.length + pendingRepayments.length + pendingLoansList.length,
      pendingAmount: pendingContribs.reduce((acc, c) => acc + (Number(c.amount) || 0), 0) + pendingRepayments.reduce((acc, r) => acc + (Number(r.amount) || 0), 0),
      accumulatedInterest,
      staffCount,

      chartData
    });

    const activities: Activity[] = [];
    confirmedContribs.forEach(c => activities.push({
      id: c.id || Math.random().toString(),
      title: c.type === 'EMERGENCY' ? t('dashboard_stats.emergency_contrib') : t('dashboard_stats.share_contrib'),
      subtitle: c.confirmedBy ? `Verified by ${c.confirmedBy}` : t('dashboard_stats.system_verified'),
      amount: Number(c.amount) || 0, timestamp: c.timestamp || new Date(0).toISOString(), isPositive: true
    }));
    const confirmedRepayments = repaymentsList.filter((r) => r.status === 'CONFIRMED');
    confirmedRepayments.forEach(r => activities.push({
      id: r.id || Math.random().toString(),
      title: t('dashboard_stats.loan_repayment'),
      subtitle: r.confirmedBy ? `Verified by ${r.confirmedBy}` : t('dashboard_stats.system_verified'),
      amount: Number(r.amount) || 0, timestamp: r.timestamp || new Date(0).toISOString(), isPositive: true
    }));
    const approvedLoans = loansList.filter((l) => l.status === 'APPROVED');
    approvedLoans.forEach((l) => activities.push({
      id: l.id || Math.random().toString(),
      title: t('dashboard_stats.loan_disbursement'),
      subtitle: l.confirmedBy ? `Approved by ${l.confirmedBy}` : t('dashboard_stats.system_verified'),
      amount: Number(l.principal) || 0, timestamp: l.timestamp || new Date(0).toISOString(), isPositive: false
    }));
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setRecentActivities(activities.slice(0, 3));
    
    // Set pending loan requests for the public view
    pendingLoansList.sort((a, b) => {
      const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return dateB - dateA;
    });
    setPendingLoanRequests(pendingLoansList);
  };

  useEffect(() => {
    // 1. Immediately load from local IndexedDB (instant render)
    loadData();

    // 2. Pull fresh data from Supabase, then reload local display
    if (navigator.onLine) {
      pullFromServer().then(() => loadData()).catch(console.warn);
    }

    // 3. Auto-refresh every 5 seconds so the dashboard stays live
    const interval = setInterval(() => {
      loadData();
      if (navigator.onLine) {
        pullFromServer().then(() => loadData()).catch(console.warn);
      }
    }, 5000);

    const handleSyncCompleted = () => {
      loadData();
    };
    window.addEventListener('sync-completed', handleSyncCompleted);

    return () => {
      clearInterval(interval);
      window.removeEventListener('sync-completed', handleSyncCompleted);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const stats = [
    { title: t('dashboard_stats.verified_capital'), value: `${settings.currency} ${data.contributions.toLocaleString()}`, icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: t('dashboard_stats.verified_emergency'), value: `${settings.currency} ${data.emergencyContributions.toLocaleString()}`, icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { title: t('dashboard_stats.active_loan_book'), value: `${settings.currency} ${data.loans.toLocaleString()}`, icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: t('dashboard_stats.accumulated_interest'), value: `${settings.currency} ${data.accumulatedInterest.toLocaleString()}`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: t('dashboard_stats.in_transit'), value: `${settings.currency} ${data.pendingAmount.toLocaleString()}`, icon: HandCoins, color: 'text-amber-500', bg: 'bg-amber-500/10' },

  ];

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground font-medium italic">{t('dashboard_stats.welcome_back')}{user?.name}{t('dashboard_stats.command_center_ready')}</p>
        </div>
        
        {(canConfirm || user?.role === 'SECRETARY') && data.pendingVerification > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 px-6 py-3 bg-amber-500 text-white rounded-[2rem] shadow-xl shadow-amber-500/20"
          >
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <p className="text-[10px] font-semibold tracking-widest leading-none mb-1 text-amber-100">
                {user?.role === 'TREASURER' ? t('dashboard_stats.attention_treasurer') : 'Attention Secretary'}
              </p>
              <p className="text-sm font-bold">
                {data.pendingVerification} {user?.role === 'TREASURER' ? t('dashboard_stats.awaiting_verification') : 'Pending Records'}
              </p>
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


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-card rounded-3xl p-6 border shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="text-primary" />
            </div>
            <h2 className="text-lg font-bold">{t('dashboard_stats.performance_overview')}</h2>
          </div>
          <div className="h-[300px] w-full">
            <div className="h-48 flex items-end gap-4 px-4">
              {data.chartData.map((d, i) => (
                <div key={i} className="flex-1 bg-primary/20 rounded-t-xl relative group transition-all" title={`${d.label}: ${settings.currency} ${d.amount.toLocaleString()}`}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${d.height}%` }} transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }} className="absolute bottom-0 left-0 right-0 bg-primary/40 rounded-t-xl" />
                  <motion.div initial={{ opacity: 0 }} whileHover={{ opacity: 1 }} animate={{ height: `${d.height}%` }} className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-xl" />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-3xl p-6 border shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="text-emerald-500" />
            </div>
            <h2 className="text-lg font-bold">{t('dashboard_stats.recent_verifications')}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
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
              <div className="h-full flex flex-col items-center justify-center opacity-50">
                 <Clock className="w-12 h-12 mb-3 text-muted-foreground" />
                 <p className="text-[10px] font-semibold text-muted-foreground tracking-widest opacity-40 uppercase">{t('dashboard_stats.no_recent_activity')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-3xl p-6 border shadow-sm flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Clock className="text-orange-500" />
            </div>
            <h2 className="text-lg font-bold">Pending Loan Requests</h2>
          </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          {pendingLoanRequests.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-border text-[10px] font-black capitalize text-muted-foreground">
                  <th className="py-4 pr-4">Date Requested</th>
                  <th className="py-4 pr-4">Member Name</th>
                  <th className="py-4 pr-4">Fund Type</th>
                  <th className="py-4 text-right">Requested Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {pendingLoanRequests.map((loan, i) => (
                  <tr key={loan.id || i} className="text-sm font-bold group hover:bg-secondary/20 transition-colors">
                    <td className="py-4 text-muted-foreground">
                      {loan.timestamp ? new Date(loan.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                    </td>
                    <td className="py-4 flex items-center gap-2">
                      {loan.memberName}
                      {loan.isTopUp && (
                        <span className="bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-purple-500/20">
                          Top Up
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${loan.fundType === 'EMERGENCY' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {loan.fundType}
                      </span>
                    </td>
                    <td className="py-4 text-right text-orange-600">
                      {settings.currency} {Number(loan.principal).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
              <div className="h-40 flex flex-col items-center justify-center opacity-50">
                 <Receipt className="w-10 h-10 mb-3 text-muted-foreground" />
                 <p className="text-[10px] font-semibold text-muted-foreground tracking-widest opacity-40 uppercase">No Pending Requests</p>
              </div>
            )}
          </div>
        </motion.div>
    </div>
  );
};

export default Dashboard;
