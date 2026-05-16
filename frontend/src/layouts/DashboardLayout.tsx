import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { LogOut, Home, Settings as SettingsIcon, Wifi, WifiOff, Menu, Users, Wallet, CreditCard, Receipt, FileText, Shield, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const { settings, isOnline } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en');
  };

  const navItems = [
    { to: '/', icon: Home, label: t('dashboard.title') },
    { to: '/members', icon: Users, label: t('members.title') },
    { to: '/contributions', icon: Wallet, label: t('contributions.title') },
    { to: '/loans', icon: CreditCard, label: t('loans.title') },
    { to: '/repayments', icon: Receipt, label: t('repayments.title') },
    { to: '/receipts', icon: Receipt, label: t('receipts.title') },
    { to: '/reports', icon: FileText, label: t('reports.title') },
    { to: '/settings', icon: SettingsIcon, label: t('settings.title') },
  ];

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass border-r transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <img 
            src="/icon-192x192.png" 
            alt="Logo" 
            className="w-10 h-10 rounded-full object-cover shadow-sm"
          />
          <div className="overflow-hidden">
            <h1 className="text-xl font-bold text-primary tracking-tight truncate">{settings.systemName}</h1>
            <p className="text-[10px] uppercase font-black text-muted-foreground truncate">{settings.organizationName}</p>
          </div>
        </div>
        
        <div className="px-4 py-4 mb-2">
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground inline-block">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link 
                key={item.to}
                to={item.to} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'hover:bg-primary/10'}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 glass border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-md hover:bg-muted" aria-label="Toggle menu" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 text-sm font-medium">
              {isOnline ? <><Wifi className="w-4 h-4 text-green-500"/> <span className="text-[10px] uppercase font-bold tracking-tight">Connected</span></> : <><WifiOff className="w-4 h-4 text-red-500"/> <span className="text-[10px] uppercase font-bold tracking-tight">Offline Mode</span></>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-xs font-black uppercase tracking-widest border border-primary/20 rounded-full hover:bg-primary/10 transition-colors"
            >
              {i18n.language.toUpperCase()}
            </button>
            
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-xs font-bold text-destructive hover:bg-destructive/10 px-4 py-2 rounded-full transition-all"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline uppercase tracking-wider">{t('dashboard.logout')}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
