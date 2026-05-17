import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  PiggyBank, 
  HeartHandshake, 
  TrendingUp,
  UserCheck
} from 'lucide-react';

const Landing = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en');
  };

  const faqs = [
    {
      q: "What is Teachers Bank Tracking System (TBTS)?",
      a: "TBTS is a secure cooperative financial tracking platform designed specifically for managing educators' share contributions, emergency funds, and organizational loans. It ensures complete transparency and accountability."
    },
    {
      q: "How does the dual-control financial workflow work?",
      a: "To maintain financial integrity, TBTS uses a strict two-person control system. The Secretary registers members and records all transactions (contributions, repayments, loan requests) as PENDING. The Treasurer then reviews, verifies, and officially confirms or rejects them."
    },
    {
      q: "How is loan interest calculated in the system?",
      a: "Unlike traditional commercial lending where interest is based on the loan principal, TBTS calculates loan interest based on the member's individual contributed shares. This model incentivizes cooperative savings over debt."
    },
    {
      q: "What access level do cooperative members have?",
      a: "Cooperative members are granted personal access keys allowing them to log in and securely audit their own history, including confirmed share pools, outstanding loans, repayments, and provisional receipts."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/icon-192x192.png" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover shadow-md"
          />
          <span className="text-2xl font-black text-primary tracking-tight">{settings.systemName}</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={toggleLanguage}
            className="px-3.5 py-1.5 text-xs font-black uppercase tracking-widest border border-primary/20 rounded-full hover:bg-primary/5 transition-colors"
          >
            {i18n.language.toUpperCase()}
          </button>
          
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-full hover:opacity-90 shadow-lg shadow-primary/20 transition-all text-sm"
          >
            {isAuthenticated ? 'Go to Dashboard' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full flex-1">
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <Sparkles className="w-4 h-4" />
            Empowering Educators' Cooperatives
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none text-foreground">
            Securing Futures, <br />
            <span className="text-primary bg-clip-text">Transparently.</span>
          </h1>
          
          <p className="text-lg text-muted-foreground font-medium max-w-xl leading-relaxed">
            Welcome to the official <strong>{settings.organizationName}</strong> tracking portal. We facilitate collaborative financial pools, low-interest credit unions, and secure auditing utilizing a dual-control workflow structure.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 shadow-xl shadow-primary/25 transition-all flex items-center gap-3 text-base"
            >
              Access Member Portal
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#about"
              className="px-8 py-4 bg-secondary text-secondary-foreground font-bold rounded-2xl hover:bg-secondary/80 transition-all text-base"
            >
              Learn More
            </a>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex justify-center"
        >
          <div className="absolute inset-0 bg-primary/10 rounded-[3rem] blur-3xl -z-10" />
          <div className="glass p-8 rounded-[3rem] shadow-2xl border border-white/20 dark:border-white/5 w-full max-w-md relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">TBTS Live Pool Status</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-4">
                <PiggyBank className="w-8 h-8 text-emerald-500" />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Verified Share Pool</h4>
                  <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Guaranteed Growth</p>
                </div>
              </div>

              <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10 flex items-center gap-4">
                <HeartHandshake className="w-8 h-8 text-rose-500" />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Emergency Aid Fund</h4>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-400">Ready Support</p>
                </div>
              </div>

              <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-4">
                <TrendingUp className="w-8 h-8 text-blue-500" />
                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loan Interest Calculation</h4>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">Share-based Calculation</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-secondary/30 border-y border-border/40 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-16">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl font-black tracking-tight">About The System</h2>
            <p className="text-muted-foreground font-medium">
              Designed to optimize governance, accelerate development, and uphold the highest tier of financial compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Dual-Control Workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Complete division of powers between Secretaries who initiate transactions, and Treasurers who authorize pool verification and confirm payouts.
              </p>
            </div>

            <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Share-Based Interest</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Our innovative model calculates loan interest purely on the borrower's contributed shares instead of outstanding debt.
              </p>
            </div>

            <div className="glass p-8 rounded-[2rem] shadow-sm hover:border-primary/20 transition-all flex flex-col gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Role-Based Gateways</h3>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                Four distinct user levels (Admin, Treasurer, Secretary, Member) ensuring customized interfaces, secure route protection, and full data compartmentalization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 max-w-4xl mx-auto px-6 w-full">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <HelpCircle className="w-4 h-4" />
            Frequently Asked Questions
          </div>
          <h2 className="text-4xl font-black tracking-tight">Any Questions? We've Got Answers</h2>
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
                  className="w-full px-6 py-5 text-left flex justify-between items-center hover:bg-primary/5 transition-colors font-bold text-base"
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

      {/* Footer */}
      <footer className="mt-auto border-t border-border/40 glass py-12 px-6 lg:px-16 text-center text-sm font-bold text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          © {new Date().getFullYear()} {settings.organizationName}. All Rights Reserved.
        </div>
        <div className="flex items-center gap-1 text-primary">
          <span>System Developer =</span>
          <span className="font-black underline tracking-tight">Indelible</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
