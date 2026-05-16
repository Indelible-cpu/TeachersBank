import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { LogOut, Home, Settings as SettingsIcon, Wifi, WifiOff, Menu, Users, Wallet, CreditCard, Receipt } from 'lucide-react';

const DashboardLayout = () => {
  const { logout } = useAuth();
  const { settings, isOnline } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en');
  };

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
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight">{settings.systemName}</h1>
            <p className="text-[10px] uppercase font-bold text-muted-foreground truncate w-32">{settings.organizationName}</p>
          </div>
        </div>
        
        <nav className="mt-6 flex flex-col gap-2 px-4">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Home className="w-5 h-5 text-primary" />
            {t('dashboard.title')}
          </Link>
          <Link to="/members" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Users className="w-5 h-5 text-primary" />
            {t('members.title')}
          </Link>
          <Link to="/contributions" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Wallet className="w-5 h-5 text-primary" />
            {t('contributions.title')}
          </Link>
          <Link to="/loans" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <CreditCard className="w-5 h-5 text-primary" />
            {t('loans.title')}
          </Link>
          <Link to="/repayments" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Receipt className="w-5 h-5 text-primary" />
            {t('repayments.title')}
          </Link>
          <Link to="/receipts" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Receipt className="w-5 h-5 text-primary" />
            {t('receipts.title')}
          </Link>
          <Link to="/reports" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <Receipt className="w-5 h-5 text-primary" />
            {t('reports.title')}
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/10 transition-colors font-medium">
            <SettingsIcon className="w-5 h-5 text-primary" />
            {t('settings.title')}
          </Link>
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
              {isOnline ? <><Wifi className="w-4 h-4 text-green-500"/> Online</> : <><WifiOff className="w-4 h-4 text-red-500"/> Offline</>}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleLanguage}
              className="px-3 py-1.5 text-sm font-medium border rounded-full hover:bg-muted transition-colors"
            >
              {i18n.language.toUpperCase()}
            </button>
            
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm font-medium text-destructive hover:bg-destructive/10 px-4 py-2 rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('dashboard.logout')}</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
