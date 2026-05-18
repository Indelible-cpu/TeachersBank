import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/useSettings';

const Terms = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const sections = [
    {
      title: t('terms.sec1_title'),
      body: t('terms.sec1_body'),
    },
    {
      title: t('terms.sec2_title'),
      body: t('terms.sec2_body'),
    },
    {
      title: t('terms.sec3_title'),
      body: t('terms.sec3_body'),
    },
    {
      title: t('terms.sec4_title'),
      body: t('terms.sec4_body'),
    },
    {
      title: t('terms.sec5_title'),
      body: t('terms.sec5_body'),
    },
    {
      title: t('terms.sec6_title'),
      body: t('terms.sec6_body'),
    },
    {
      title: t('terms.sec7_title'),
      body: t('terms.sec7_body'),
    },
    {
      title: t('terms.sec8_title'),
      body: t('terms.sec8_body'),
    },
    {
      title: t('terms.sec9_title'),
      body: t('terms.sec9_body'),
    },
    {
      title: t('terms.sec10_title'),
      body: (
        <>
          {t('terms.sec10_body_1')}
          <a href="mailto:indelible.support@gmail.com" className="text-blue-500 hover:text-blue-600 hover:underline">
            indelible.support@gmail.com
          </a>
          {t('terms.sec10_body_2')}
          <a href="https://wa.me/265993732694" target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-bold">
            WhatsApp
          </a>
          {t('terms.sec10_body_3')}
          <a href="https://www.facebook.com/JEFInvestment" target="_blank" rel="noopener noreferrer" className="text-[#1877F2] hover:underline font-bold">
            Facebook
          </a>.
        </>
      ),
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

      <main className="flex-1 pt-28 pb-20 px-6 lg:px-16 max-w-4xl mx-auto w-full space-y-12">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <FileText className="w-4 h-4" />
            {t('terms.tag')}
          </div>
          <h1 className="text-5xl font-black tracking-tight">{t('terms.title')}</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto">
            {t('terms.subtitle')}
          </p>
          <p className="text-xs text-muted-foreground opacity-60 font-semibold">{t('terms.last_updated')}</p>
        </motion.div>

        {/* Terms sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass p-7 rounded-[1.75rem] border border-border/20 flex gap-5"
            >
              <div className="shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-primary opacity-60" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-base tracking-tight">{section.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{section.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/10 py-6 px-6 text-center text-xs text-muted-foreground font-semibold opacity-60">
        © 2026 Indelible Technologies. {t('common.all_rights_reserved')}
      </footer>
    </div>
  );
};

export default Terms;
