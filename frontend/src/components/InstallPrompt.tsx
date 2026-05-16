import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Globe } from 'lucide-react';
import { usePWA } from '../context/PWAContext';

const InstallPrompt = () => {
  const { showPrompt, installPWA, dismissPrompt } = usePWA();

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
            
            <button 
              onClick={dismissPrompt}
              title="Dismiss"
              aria-label="Dismiss installation prompt"
              className="absolute top-6 right-6 p-2 bg-secondary rounded-full hover:bg-secondary/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mb-6">
                <Download className="w-8 h-8 text-primary-foreground" />
              </div>

              <h2 className="text-2xl font-black tracking-tight mb-2">Enhance Your Experience</h2>
              <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                Install <span className="font-bold text-foreground">Teachers Bank</span> on your home screen for fast, offline-ready access and a native mobile feel.
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-white/5 flex flex-col items-center gap-2 text-center">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Mobile Ready</span>
                </div>
                <div className="p-4 rounded-2xl bg-secondary/50 border border-white/5 flex flex-col items-center gap-2 text-center">
                  <Globe className="w-5 h-5 text-emerald-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Offline Access</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={installPWA}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Install Now
                </button>
                <button 
                  onClick={dismissPrompt}
                  className="w-full py-4 text-muted-foreground font-black uppercase tracking-widest text-xs hover:text-foreground transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default InstallPrompt;
