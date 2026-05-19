import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useTranslation } from 'react-i18next';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { verifyOfflineCredentials, cacheOfflineCredentials, pullFromServer, performSync } from '../services/db';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { settings, isOnline } = useSettings();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('remembered_email');
    const savedRememberMe = localStorage.getItem('remember_me') === 'true';
    if (savedRememberMe) {
      setRememberMe(true);
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      // Try online login first if navigator says online
      if (isOnline) {
        try {
          // Set a short network timeout to fail fast if "out of bundle" (connected but no internet flow)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout
          
          const response = await authApi.login({ email, password });
          clearTimeout(timeoutId);
          
          const { token, user } = response.data;
          
          // Cache credentials locally for offline fallback
          await cacheOfflineCredentials(email, password, user, token);
          await login(token, user, rememberMe);

          // CRITICAL: Pull latest data from Supabase before navigating.
          // This ensures dashboard is populated even on a fresh device.
          pullFromServer().catch(e => console.warn('Post-login pull failed:', e));
          // Also flush any local pending queue
          performSync().catch(e => console.warn('Post-login push failed:', e));

          navigate('/dashboard');
          return;
        } catch (networkErr: any) {
          console.warn('Online login failed or timed out. Falling back to offline cache.', networkErr);
          // If it was a credential rejection (400, 401, 403), do not fall back. Throw it directly.
          if (networkErr.response && [400, 401, 403].includes(networkErr.response.status)) {
            throw new Error(networkErr.response.data?.error || 'Invalid credentials');
          }
          // For other errors (like timeout, 5xx, or network failure), let it flow to offline verification below
        }
      }

      // Fallback: Verify offline credentials
      const cachedSession = await verifyOfflineCredentials(email, password);
      if (cachedSession) {
        const { user, token } = cachedSession;
        await login(token, user, rememberMe);
        // Still try to pull/push in background even on offline fallback
        pullFromServer().catch(e => console.warn('Offline-mode pull failed:', e));
        performSync().catch(e => console.warn('Offline-mode push failed:', e));
        navigate('/dashboard');
      } else {
        if (!isOnline) {
          throw new Error('Offline login failed. You must log in online at least once on this device.');
        } else {
          throw new Error('Invalid email or password.');
        }
      }
    } catch (err: any) {
      const message = err.message || 'Login failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl border-4 border-white">
              <img src="/icon-192x192.png" alt="Logo" className="w-full h-full rounded-full object-cover" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">{settings.systemName}</h1>
            <p className="text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          {!isOnline && (
            <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t('login.offline_notice')}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium text-center">
              {String(error)}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">{t('login.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  id="email"
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="admin@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">{t('login.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  id="password"
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                />
                <span className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">Remember Me</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-3.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {isLoading ? '...' : t('login.submit')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t flex items-center justify-between">
            <button 
              onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ny' : 'en')}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {i18n.language === 'en' ? 'Switch to Chichewa' : 'Switch to English'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
