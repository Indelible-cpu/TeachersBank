import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, UserCheck, Coins, HeartHandshake, ArrowLeft } from 'lucide-react';
import { useSettings } from '../context/useSettings';

const About = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 min-h-[5rem] py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-lg font-black text-primary tracking-tight">{settings.systemName}</span>
      </header>

      <main className="flex-1 pt-28 pb-20 px-6 lg:px-16 max-w-7xl mx-auto w-full space-y-20">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center space-y-4">
          <h1 className="text-5xl font-black tracking-tight">{t('landing.about_title')}</h1>
          <p className="text-muted-foreground font-medium max-w-2xl mx-auto text-lg">{t('landing.about_desc')}</p>
        </motion.div>

        {/* Live Pool Status */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass p-8 rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/5 w-full relative overflow-hidden">
            <div className="flex justify-between items-center mb-8 border-b border-border/20 pb-4">
              <span className="text-sm font-black tracking-widest text-muted-foreground">{t('landing.live_status')}</span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs font-bold text-emerald-500 tracking-widest">Live</span>
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex flex-col gap-3">
                <Coins className="w-10 h-10 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-black text-muted-foreground tracking-wider">{t('landing.verified_share_pool')}</h4>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{t('landing.verified_growth')}</p>
                </div>
              </div>
              <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 flex flex-col gap-3">
                <HeartHandshake className="w-10 h-10 text-rose-500" />
                <div>
                  <h4 className="text-xs font-black text-muted-foreground tracking-wider">{t('landing.emergency_fund')}</h4>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{t('landing.ready_support')}</p>
                </div>
              </div>
              <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex flex-col gap-3">
                <TrendingUp className="w-10 h-10 text-blue-500" />
                <div>
                  <h4 className="text-xs font-black text-muted-foreground tracking-wider">{t('landing.loan_interest_calc')}</h4>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{t('landing.share_based_calc')}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, title: t('landing.workflow_title'), desc: t('landing.workflow_desc'), color: 'text-primary', bg: 'bg-primary/10' },
            { icon: TrendingUp, title: t('landing.interest_title'), desc: t('landing.interest_desc'), color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { icon: UserCheck, title: t('landing.gateways_title'), desc: t('landing.gateways_desc'), color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4"
            >
              <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/10 py-6 px-6 text-center text-xs text-muted-foreground font-semibold opacity-60">
        © 2026 Indelible Technologies. All rights reserved.
      </footer>
    </div>
  );
};

export default About;
