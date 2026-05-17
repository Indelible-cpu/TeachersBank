import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { useSettings } from '../context/useSettings';

const FAQ = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    { q: t('landing.faq_q1'), a: t('landing.faq_a1') },
    { q: t('landing.faq_q5'), a: t('landing.faq_a5') },
    { q: t('landing.faq_q2'), a: t('landing.faq_a2') },
    { q: t('landing.faq_q3'), a: t('landing.faq_a3') },
    { q: t('landing.faq_q4'), a: t('landing.faq_a4') },
    { q: t('landing.faq_q6'), a: t('landing.faq_a6') },
    { q: t('landing.faq_q7'), a: t('landing.faq_a7') },
    { q: t('landing.faq_q8'), a: t('landing.faq_a8') },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 min-h-[5rem] py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-lg font-black text-primary tracking-tight">{settings.systemName}</span>
      </header>

      <main className="flex-1 pt-28 pb-20 px-6 lg:px-16 max-w-4xl mx-auto w-full space-y-12">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <HelpCircle className="w-4 h-4" />
            {t('landing.faq_tag')}
          </div>
          <h1 className="text-5xl font-black tracking-tight">{t('landing.faq_title')}</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto">
            Everything you need to know about how the system works.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * index }}
                className="glass rounded-2xl border border-border/40 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-primary/5 transition-colors font-bold text-base gap-4"
                >
                  <span>{faq.q}</span>
                  {isOpen
                    ? <ChevronUp className="w-5 h-5 text-primary shrink-0" />
                    : <ChevronDown className="w-5 h-5 text-primary shrink-0" />
                  }
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-sm text-muted-foreground font-medium leading-relaxed border-t border-border/10 pt-4 bg-muted/20">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-border/10 py-6 px-6 text-center text-xs text-muted-foreground font-semibold opacity-60">
        © 2026 Indelible Technologies. All rights reserved.
      </footer>
    </div>
  );
};

export default FAQ;
