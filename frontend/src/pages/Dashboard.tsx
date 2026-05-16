import { useSettings } from '../context/SettingsContext';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, Receipt, Users } from 'lucide-react';

const Dashboard = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();

  const stats = [
    { title: t('dashboard.contributions'), value: 'MWK 4,500,000', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: t('dashboard.loans'), value: 'MWK 1,200,000', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: t('dashboard.receipts'), value: '142', icon: Receipt, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Total Members', value: '45', icon: Users, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Welcome to {settings.systemName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
