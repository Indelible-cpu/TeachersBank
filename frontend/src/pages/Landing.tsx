import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Coins, 
  HeartHandshake, 
  TrendingUp,
  UserCheck,
  Database,
  Lock
} from 'lucide-react';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showLearnMore, setShowLearnMore] = useState(false);

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en');
  };

  const faqs = [
    { q: t('landing.faq_q1'), a: t('landing.faq_a1') },
    { q: t('landing.faq_q5'), a: t('landing.faq_a5') },
    { q: t('landing.faq_q2'), a: t('landing.faq_a2') },
    { q: t('landing.faq_q3'), a: t('landing.faq_a3') },
    { q: t('landing.faq_q4'), a: t('landing.faq_a4') },
    { q: t('landing.faq_q6'), a: t('landing.faq_a6') },
    { q: t('landing.faq_q7'), a: t('landing.faq_a7') },
    { q: t('landing.faq_q8'), a: t('landing.faq_a8') }
  ];

  return (
    <div className={`min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 ${!showLearnMore ? 'h-screen overflow-hidden' : ''}`}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 min-h-[5rem] py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img 
            src="/icon-192x192.png" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover shadow-md shrink-0"
          />
          <span className="text-lg md:text-2xl font-black text-primary tracking-tight text-center md:text-left leading-tight break-words">{settings.systemName}</span>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <button 
            onClick={toggleLanguage}
            className="px-4 py-1.5 text-xs font-black tracking-widest border border-primary/20 rounded-full hover:bg-primary/5 transition-colors"
          >
            {i18n.language === 'en' ? 'Eng' : 'Ny'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6 lg:px-16 max-w-4xl mx-auto flex flex-col items-center text-center space-y-6 w-full flex-1 justify-center">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <Sparkles className="w-4 h-4" />
            {t('landing.hero_tag')}
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-none text-foreground">
            {t('landing.hero_title_1')} <br />
            <span className="text-primary bg-clip-text">{t('landing.hero_title_2')}</span>
          </h1>
          
          <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
            {t('landing.hero_desc')}
          </p>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-6 w-full max-w-2xl px-4">
            <button
              onClick={() => setShowLearnMore(!showLearnMore)}
              className={`py-5 px-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 hover:shadow-2xl hover:shadow-emerald-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 transition-all duration-300 text-base flex items-center justify-center gap-3 border border-emerald-500/20 ${!showLearnMore ? 'flex-1 w-full md:w-auto' : 'w-full max-w-xs'}`}
            >
              {showLearnMore ? t('landing.btn_show_less') : t('landing.btn_learn_more')}
              {showLearnMore ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            <AnimatePresence>
              {!showLearnMore && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  className="flex-1 w-full md:w-auto py-5 px-10 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black tracking-wider rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 transition-all duration-300 text-base flex items-center justify-center gap-3 animate-pulse"
                  style={{ animationDuration: '4s' }}
                >
                  {isAuthenticated ? t('dashboard.title') : t('login.submit')}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </section>

      {/* Learn More Expandable Content */}
      <AnimatePresence>
        {showLearnMore && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden w-full space-y-12"
          >
            {/* Live Pool Status */}
            <section className="py-12 max-w-4xl mx-auto px-6">
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
            </section>

            {/* About Section */}
            <section className="py-20 bg-secondary/30 border-y border-border/40">
              <div className="max-w-7xl mx-auto px-6 lg:px-16">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                  <h2 className="text-4xl font-black tracking-tight">{t('landing.about_title')}</h2>
                  <p className="text-muted-foreground font-medium">
                    {t('landing.about_desc')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">{t('landing.workflow_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {t('landing.workflow_desc')}
                    </p>
                  </div>

                  <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">{t('landing.interest_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {t('landing.interest_desc')}
                    </p>
                  </div>

                  <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                      <UserCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold">{t('landing.gateways_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {t('landing.gateways_desc')}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Security, Storage & Privacy Section */}
            <section className="py-20 bg-gradient-to-b from-transparent to-secondary/10 border-b border-border/40">
              <div className="max-w-7xl mx-auto px-6 lg:px-16">
                <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    {t('landing.sec_stor_priv_title')}
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">{t('landing.sec_stor_priv_title')}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Security */}
                  <div className="glass p-8 rounded-[2rem] shadow-lg hover:border-emerald-500/20 transition-all flex flex-col gap-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center font-bold relative z-10">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold relative z-10">{t('landing.security_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium relative z-10">
                      {t('landing.security_desc')}
                    </p>
                  </div>

                  {/* Storage */}
                  <div className="glass p-8 rounded-[2rem] shadow-lg hover:border-blue-500/20 transition-all flex flex-col gap-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center font-bold relative z-10">
                      <Database className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold relative z-10">{t('landing.storage_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium relative z-10">
                      {t('landing.storage_desc')}
                    </p>
                  </div>

                  {/* Privacy */}
                  <div className="glass p-8 rounded-[2rem] shadow-lg hover:border-violet-500/20 transition-all flex flex-col gap-4 border border-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-12 h-12 bg-violet-500/10 text-violet-500 rounded-xl flex items-center justify-center font-bold relative z-10">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold relative z-10">{t('landing.privacy_title')}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium relative z-10">
                      {t('landing.privacy_desc')}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="py-20 max-w-4xl mx-auto px-6 w-full">
              <div className="text-center mb-16 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
                  <HelpCircle className="w-4 h-4" />
                  {t('landing.faq_tag')}
                </div>
                <h2 className="text-4xl font-black tracking-tight">{t('landing.faq_title')}</h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, index) => {
                  const isOpen = activeFaq === index;
                  return (
                    <div 
                      key={index}
                      className="glass rounded-2xl border border-border/40 overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : index)}
                        className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-primary/5 transition-colors font-bold text-base gap-4"
                      >
                        <span>{faq.q}</span>
                        {isOpen ? <ChevronUp className="w-5 h-5 text-primary shrink-0" /> : <ChevronDown className="w-5 h-5 text-primary shrink-0" />}
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
                    </div>
                  );
                })}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-border/40 glass py-6 px-6 lg:px-16 text-center text-sm font-bold text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} {settings.organizationName}. All Rights Reserved.
        </div>
        <div className="flex items-center gap-1 text-primary">
          <span>System Developer:</span>
          <span className="font-black underline tracking-tight">Indelible</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
