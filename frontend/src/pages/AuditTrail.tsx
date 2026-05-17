import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, User, Shield, Clock, Info, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

interface AuditLog {
  id: string;
  action: string;
  userRole: string;
  status: string;
  startTime: string;
  endTime?: string;
  details?: string;
  user?: { name: string; email: string };
}

const AuditTrail = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/audit-logs');
        setLogs(res.data || []);
      } catch (err) {
        console.error('Failed to fetch system logs from backend:', err);
      }
    })();
  }, []);

  const filteredLogs = logs.filter(log => {
    const userName = log.user?.name || 'System';
    const action = log.action || '';
    const details = log.details || '';
    
    const matchesSearch = userName.toLowerCase().includes(search.toLowerCase()) || 
                          action.toLowerCase().includes(search.toLowerCase()) ||
                          details.toLowerCase().includes(search.toLowerCase());
                          
    const matchesFilter = filter === 'ALL' || 
                          (filter === 'SUCCESS' && log.status === 'SUCCESS') ||
                          (filter === 'FAIL' && log.status !== 'SUCCESS') ||
                          action.includes(filter);
                          
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail Ledger</h1>
          <p className="text-muted-foreground font-medium italic">Immutable history of administrative actions, operations, and system security events.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl border border-primary/10 font-bold text-xs">
          <Shield className="w-4 h-4" />
          Active Ledger Node
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50" />
            <input 
              type="text" 
              placeholder="Search audit trail ledger..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 glass rounded-[1.5rem] border-transparent focus:ring-4 focus:ring-primary/10 transition-all outline-none font-medium"
            />
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass p-5 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/30 transition-all border border-transparent shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {log.user?.name || 'System'}
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded-full">
                        {log.userRole || 'System'}
                      </span>
                    </h4>
                    <p className="text-xs font-black text-muted-foreground mt-0.5 flex items-center gap-1.5 uppercase tracking-wide">
                      Action: {log.action.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col md:items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    {log.status === 'SUCCESS' ? (
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" /> SUCCESS
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        <XCircle className="w-3 h-3" /> FAILED
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold">
                      <Clock className="w-3 h-3" />
                      {new Date(log.startTime).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic max-w-md md:text-right font-medium">
                    {log.details || 'No additional detail recorded.'}
                  </p>
                </div>
              </motion.div>
            ))}

            {filteredLogs.length === 0 && (
              <div className="p-20 text-center text-muted-foreground font-black uppercase tracking-widest opacity-25">
                No ledger entries found
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2.5rem] border border-primary/10 bg-primary/5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Filter entries</h3>
            <div className="flex flex-col gap-2">
              {[
                { key: 'ALL', label: 'All Operations' },
                { key: 'SUCCESS', label: 'Success Actions' },
                { key: 'FAIL', label: 'Failed Operations' },
                { key: 'CREATE', label: 'Creations' },
                { key: 'UPDATE', label: 'Updates' },
                { key: 'DELETE', label: 'Deletions' }
              ].map(t => (
                <button 
                  key={t.key}
                  onClick={() => setFilter(t.key)}
                  className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === t.key ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
