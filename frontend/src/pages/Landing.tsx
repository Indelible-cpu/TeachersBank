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
            <div className="flex flex-col items-start md:items-end gap-2">
              <span className="text-xs font-black text-muted-foreground opacity-60">Support</span>
              {/* Email + social icons on ONE row */}
              <div className="flex items-center gap-3 flex-nowrap md:justify-end">
                <a
                  href="mailto:indelible.support@gmail.com"
                  className="text-sm font-bold text-blue-500 hover:text-blue-600 hover:underline transition-all duration-200 whitespace-nowrap"
                >
                  indelible.support@gmail.com
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/265993732694"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-all duration-200 hover:scale-110"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                </a>

                {/* Facebook (Lite) */}
                <a
                  href="https://www.facebook.com/JEFInvestment"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] transition-all duration-200 hover:scale-110"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
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
