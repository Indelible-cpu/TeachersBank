import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, User, Shield, Clock, Info } from 'lucide-react';
import { getSetting } from '../services/db';

interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  ip?: string;
}

const AuditTrail = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      // Mock logs for demonstration if none exist in DB yet
      const cachedLogs = await getSetting('audit_logs') || [
        {
          id: '1',
          userId: 'admin',
          userName: 'Administrator',
          action: 'CREATE_USER',
          target: 'Member: John Doe',
          details: 'New member profile established with default shares.',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          userId: 'sec-01',
          userName: 'Secretary One',
          action: 'APPROVE_LOAN',
          target: 'Loan ID: L-9921',
          details: 'Loan approved after verifying credit score.',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ];
      setLogs(cachedLogs.sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    })();
  }, []);

  const filteredLogs = logs.filter(log => 
    (log.userName.toLowerCase().includes(search.toLowerCase()) || 
     log.action.toLowerCase().includes(search.toLowerCase()) ||
     log.target.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'ALL' || log.action.includes(filter))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Audit Trail</h1>
          <p className="text-muted-foreground font-medium italic">Immutable ledger of administrative actions and security events.</p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl border border-primary/10 font-bold text-xs">
          <Shield className="w-4 h-4" />
          Security log active
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-50" />
            <input 
              type="text" 
              placeholder="Search by user, action, or target..." 
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
                      {log.userName}
                      <span className="text-[10px] font-semibold text-muted-foreground capitalize tracking-widest px-2 py-0.5 bg-muted rounded-full">
                        {log.action.replace('_', ' ').toLowerCase()}
                      </span>
                    </h4>
                    <p className="text-xs font-medium text-primary mt-0.5">{log.target}</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:items-end gap-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground italic max-w-md md:text-right">{log.details}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2.5rem] border border-primary/10 bg-primary/5">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-primary" /> Filter by type</h3>
            <div className="flex flex-col gap-2">
              {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'].map(t => (
                <button 
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${filter === t ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10 text-muted-foreground'}`}
                >
                  {t === 'ALL' ? 'All events' : `${t.charAt(0) + t.slice(1).toLowerCase()} events`}
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
