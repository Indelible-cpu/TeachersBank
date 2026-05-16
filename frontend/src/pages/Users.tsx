import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Activity, Clock, Terminal, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  userRole: string;
  status: string;
  startTime: string;
  endTime: string;
  details: string;
  user: { name: string; email: string };
}

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await api.get('/users');
        setUsers(res.data);
      } else {
        const res = await api.get('/users/audit-logs');
        setAuditLogs(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert('Failed to update role');
    }
  };

  const toggleStatus = async (u: User) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      setUsers(users.map(user => user.id === u.id ? { ...user, isActive: !u.isActive } : user));
    } catch (error) {
      alert('Failed to update status');
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="p-8 text-center font-bold">Access Denied</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          System Administration
        </h1>
        <p className="text-muted-foreground font-medium italic">Manage user privileges and track every system activity.</p>
      </div>

      <div className="flex p-1.5 glass rounded-2xl w-fit mb-4">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10'}`}
        >
          <UserIcon className="w-4 h-4" /> User Management
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition-all ${activeTab === 'logs' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10'}`}
        >
          <Activity className="w-4 h-4" /> Audit Trails
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'users' ? (
          <motion.div 
            key="users"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {users.map((u) => (
              <div key={u.id} className="glass rounded-[2rem] p-6 flex flex-col gap-5 border border-transparent hover:border-primary/20 transition-all shadow-sm">
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-2xl ${u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {u.role === 'ADMIN' ? <ShieldAlert /> : u.role === 'TREASURER' ? <ShieldCheck /> : <Shield />}
                  </div>
                  <button 
                    onClick={() => toggleStatus(u)}
                    className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border transition-all ${u.isActive ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}
                  >
                    {u.isActive ? 'Active' : 'Suspended'}
                  </button>
                </div>

                <div>
                  <h3 className="font-black text-xl leading-tight">{u.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{u.email}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Assign Role</label>
                  <select 
                    title="Change User Role"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary font-bold text-sm appearance-none"
                  >
                    <option value="ADMIN">Administrator</option>
                    <option value="TREASURER">Treasurer (Read-Only)</option>
                    <option value="SECRETARY">Secretary</option>
                    <option value="MEMBER">Regular Member</option>
                  </select>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="logs"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass rounded-[2.5rem] overflow-hidden shadow-xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 bg-secondary/30">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">User / Role</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action Performed</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Time Execution</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/20 hover:bg-primary/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{log.user.name}</span>
                          <span className="text-[10px] font-black text-primary uppercase">{log.userRole}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-muted-foreground opacity-40" />
                          <span className="font-black text-xs uppercase tracking-tight">{log.action}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.status === 'SUCCESS' ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500"><CheckCircle className="w-3 h-3" /> OK</span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-500"><XCircle className="w-3 h-3" /> FAIL</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold">{new Date(log.startTime).toLocaleTimeString()}</span>
                            <span className="text-[9px] font-medium opacity-60">{new Date(log.startTime).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {auditLogs.length === 0 && (
              <div className="p-20 text-center text-muted-foreground font-black uppercase tracking-widest opacity-20">
                No logs detected in buffer
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
