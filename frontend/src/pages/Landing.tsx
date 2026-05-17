import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ArrowRight, Moon, Sun } from 'lucide-react';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith('en') ? 'ny' : 'en');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
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

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-full border border-primary/20 hover:bg-primary/5 transition-colors text-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleLanguage}
            className="px-4 py-1.5 text-xs font-black tracking-widest border border-primary/20 rounded-full hover:bg-primary/5 transition-colors"
          >
            {i18n.language.startsWith('en') ? 'Eng' : 'Ny'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 pt-24 pb-8 px-6 lg:px-16 max-w-4xl mx-auto flex flex-col items-center text-center space-y-6 w-full justify-center min-h-[calc(100vh-200px)]">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 flex flex-col items-center"
        >
          <h1 className="text-5xl lg:text-7xl font-black tracking-tight leading-none text-foreground">
            {t('landing.hero_title_1')} <br />
            <span className="text-primary bg-clip-text">{t('landing.hero_title_2')}</span>
          </h1>

          <p className="text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
            A secure digital platform built to facilitate transparent operations, efficient workflow management, and reliable organizational record tracking.
          </p>

          <motion.button
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="py-5 px-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black tracking-wider rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 transition-all duration-300 text-base flex items-center justify-center gap-3 animate-pulse"
            style={{ animationDuration: '4s' }}
          >
            {isAuthenticated ? t('dashboard.title') : t('login.submit')}
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </section>

      {/* SaaS Footer */}
      <footer className="border-t border-border/10 bg-secondary/20 pt-16 pb-8 px-6 lg:px-16 w-full">
        <div className="max-w-7xl mx-auto flex flex-col gap-12">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-4 items-start md:items-center">
            {/* Left: Brand */}
            <div className="flex flex-col gap-2">
              <span className="text-2xl font-black text-foreground tracking-tight">Indelible Technologies</span>
              <p className="text-sm font-semibold text-muted-foreground opacity-80">Secure • Reliable • Built for scale</p>
            </div>

            {/* Middle: Navigation */}
            <div className="flex flex-row items-center justify-center gap-6 md:gap-8 flex-wrap">
              <Link to="/about" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap">About</Link>
              <Link to="/privacy" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap">Privacy Policy</Link>
              <Link to="/terms" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap">Terms of Service</Link>
              <Link to="/faq" className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors duration-200 whitespace-nowrap">FAQ</Link>
            </div>

            {/* Right: Support */}
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-60">Support</span>
              <a
                href="mailto:indelible.support@gmail.com"
                className="text-sm font-bold text-blue-500 hover:text-blue-600 hover:underline transition-all duration-200"
              >
                indelible.support@gmail.com
              </a>
            </div>
          </div>

          <div className="border-t border-border/10 pt-8 flex items-center justify-center">
            <p className="text-sm font-bold text-muted-foreground opacity-60 tracking-wide">
              © 2026 Indelible. All rights reserved.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default Landing;
