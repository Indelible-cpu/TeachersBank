import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { LogOut, Home, Settings as SettingsIcon, Wifi, WifiOff, Menu, Users, Wallet, CreditCard, Receipt, FileText, Shield, User as UserIcon, Moon, Sun, History as HistoryIcon, Sliders } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { getSetting } from '../services/db';

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  const { settings, isOnline } = useSettings();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (user?.id) {
        const photo = await getSetting(`profile_photo_${user.id}`);
        if (photo) setProfilePhoto(photo as string);
      }
    })();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en');
  };

  const navItems = [
    { to: '/dashboard', label: t('dashboard.title'), icon: Home, roles: ['ADMIN', 'TREASURER', 'SECRETARY', 'MEMBER'] },
    { to: '/dashboard/members', label: t('members.title'), icon: Users, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/contributions', label: t('contributions.title'), icon: Wallet, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/loans', label: t('loans.title'), icon: CreditCard, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/repayments', label: t('repayments.title'), icon: Receipt, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/receipts', label: t('receipts.title'), icon: Receipt, roles: ['ADMIN', 'TREASURER', 'SECRETARY', 'MEMBER'] },
    { to: '/dashboard/reports', label: t('reports.title'), icon: FileText, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/audit-trail', label: t('audit.title'), icon: HistoryIcon, roles: ['ADMIN', 'TREASURER', 'SECRETARY'] },
    { to: '/dashboard/users', label: t('users.title'), icon: Shield, roles: ['ADMIN'] },
    { to: '/dashboard/loan-configurations', label: t('loan_configs.title'), icon: Sliders, roles: ['ADMIN'] },
    { to: '/dashboard/settings', label: t('settings.title'), icon: SettingsIcon, roles: ['ADMIN', 'TREASURER', 'SECRETARY', 'MEMBER'] }
  ].filter(item => item.roles.includes(user?.role || ''));

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-background flex text-foreground">
      {/* Sidebar - Desktop/Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass border-r transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <Link to="/dashboard" className="flex items-center gap-3" onClick={closeSidebar}>
            <img 
              src="/icon-192x192.png" 
              alt="Logo" 
              className="w-10 h-10 rounded-full object-cover shadow-sm"
            />
            <div className="overflow-hidden break-words">
              <h1 className="text-xl font-bold text-primary tracking-tight leading-tight">{settings.systemName}</h1>
            </div>
          </Link>
        </div>
        
        <div className="px-4 py-4 mb-2">
          <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <UserIcon className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <span className="text-[10px] font-semibold capitalize tracking-wider px-1.5 py-0.5 rounded bg-primary text-primary-foreground inline-block">
                {user?.role?.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 px-4 overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link 
                key={item.to}
                to={item.to} 
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${isActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]' : 'hover:bg-primary/10'}`}
                onClick={closeSidebar}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-primary'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors text-sm font-bold"
          >
            <span className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
              {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-secondary'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>
        </div>
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
              {isOnline ? <><Wifi className="w-4 h-4 text-green-500"/> <span className="text-[10px] font-semibold tracking-tight">{t('dashboard.connected')}</span></> : <><WifiOff className="w-4 h-4 text-red-500"/> <span className="text-[10px] font-semibold tracking-tight">{t('dashboard.offline_mode')}</span></>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-xs font-black tracking-widest border border-primary/20 rounded-full hover:bg-primary/10 transition-colors"
            >
              {i18n.language.startsWith('en') ? 'Eng' : 'Ny'}
            </button>
            
            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-xs font-bold text-destructive hover:bg-destructive/10 px-4 py-2 rounded-full transition-all"
            >
              <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline tracking-wider capitalize">{t('dashboard.logout').toLowerCase()}</span>
            </button>

            {settings.showProfileInHeader && (
              <div className="flex items-center gap-2 border-l border-border/50 pl-4 ml-2">
                <div className="hidden md:block text-right">
                  <p className="text-[10px] font-bold leading-tight">{user?.name}</p>
                  <p className="text-[8px] text-muted-foreground capitalize tracking-widest">{user?.role?.toLowerCase()}</p>
                </div>
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-primary/20 shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 shadow-sm">
                    {user?.name?.charAt(0)}
                  </div>
                )}
              </div>
            )}
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
            onClick={closeSidebar}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
