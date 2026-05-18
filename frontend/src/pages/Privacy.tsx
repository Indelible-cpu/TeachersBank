import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ShieldCheck, Database, Lock, ArrowLeft } from 'lucide-react';
import { useSettings } from '../context/useSettings';

const Privacy = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const cards = [
    {
      icon: ShieldCheck,
      title: t('landing.security_title'),
      desc: t('landing.security_desc'),
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/20',
      glow: 'from-emerald-500/5',
    },
    {
      icon: Database,
      title: t('landing.storage_title'),
      desc: t('landing.storage_desc'),
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/20',
      glow: 'from-blue-500/5',
    },
    {
      icon: Lock,
      title: t('landing.privacy_title'),
      desc: t('landing.privacy_desc'),
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'hover:border-violet-500/20',
      glow: 'from-violet-500/5',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 min-h-[5rem] py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t('common.back')}
        </Link>
        <span className="text-lg font-black text-primary tracking-tight">{settings.systemName}</span>
      </header>

      <main className="flex-1 pt-28 pb-20 px-6 lg:px-16 max-w-7xl mx-auto w-full space-y-16">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <ShieldCheck className="w-4 h-4" />
            {t('landing.sec_stor_priv_title')}
          </div>
          <h1 className="text-5xl font-black tracking-tight">{t('landing.sec_stor_priv_title')}</h1>
          <p className="text-muted-foreground font-medium max-w-2xl mx-auto text-lg">
            {t('privacy.subtitle')}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className={`glass p-8 rounded-[2rem] shadow-lg ${card.border} transition-all flex flex-col gap-4 border border-white/5 relative overflow-hidden group`}
            >
              <div className={`absolute inset-0 bg-gradient-to-b ${card.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center relative z-10`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold relative z-10">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium relative z-10">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Extended legal notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass p-10 rounded-[2.5rem] border border-border/20 space-y-6 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl font-black">{t('privacy.legal_title')}</h2>
          <div className="space-y-4 text-sm text-muted-foreground font-medium leading-relaxed">
            <p>{t('privacy.legal_p1')}</p>
            <p>{t('privacy.legal_p2')}</p>
            <p>{t('privacy.legal_p3')}</p>
            <p>{t('privacy.legal_p4')}<a href="mailto:indelible.support@gmail.com" className="text-blue-500 hover:underline">indelible.support@gmail.com</a>.</p>
          </div>
        </motion.div>
      </main>

      <footer className="border-t border-border/10 py-6 px-6 text-center text-xs text-muted-foreground font-semibold opacity-60">
        © 2026 Indelible Technologies. {t('common.all_rights_reserved')}
      </footer>
    </div>
  );
};

export default Privacy;
