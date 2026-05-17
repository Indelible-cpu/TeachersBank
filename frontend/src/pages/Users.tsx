import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Activity, Clock, Terminal, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/useToast';

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
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'MEMBER' });

  const fetchData = useCallback(async () => {
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
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/users/${userId}`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Role updated successfully');
    } catch (error) {
      console.error('Failed to update role', error);
      toast.error('Failed to update role');
    }
  };

  const toggleStatus = async (u: User) => {
    try {
      await api.patch(`/users/${u.id}`, { isActive: !u.isActive });
      setUsers(users.map(user => user.id === u.id ? { ...user, isActive: !u.isActive } : user));
      toast.success(`User status ${!u.isActive ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Failed to update status');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', newUser);
      setIsModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'MEMBER' });
      toast.success('User added successfully');
      fetchData(); // Refresh list
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to add user');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete ${u.name}?`)) {
      try {
        await api.delete(`/users/${u.id}`);
        setUsers(users.filter(user => user.id !== u.id));
        toast.success('User deleted successfully');
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || 'Failed to delete user');
      }
    }
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="p-8 text-center font-bold">Access Denied</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          System administration
        </h1>
        <p className="text-muted-foreground font-medium italic">Manage user privileges and track every system activity.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4">
        <div className="flex p-1.5 glass rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'users' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10'}`}
          >
            <UserIcon className="w-4 h-4" /> User management
          </button>
          <button 
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'logs' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' : 'hover:bg-primary/10'}`}
          >
            <Activity className="w-4 h-4" /> Audit trails
          </button>
        </div>
        {activeTab === 'users' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-xl shadow-primary/20"
          >
            + Add system user
          </button>
        )}
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
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleStatus(u)}
                      className={`text-[10px] font-semibold px-3 py-1 rounded-full capitalize tracking-widest border transition-all ${u.isActive ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}
                    >
                      {u.isActive ? 'Active' : 'Suspended'}
                    </button>
                    {u.id !== currentUser?.id && (
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="text-[10px] font-semibold px-3 py-1 rounded-full capitalize tracking-widest border transition-all bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-xl leading-tight">{u.name}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{u.email}</p>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/50">
                  <label className="text-[10px] font-semibold capitalize text-muted-foreground tracking-widest ml-1">Assign role</label>
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
                    <th className="px-6 py-4 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">User / role</th>
                    <th className="px-6 py-4 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Action performed</th>
                    <th className="px-6 py-4 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Status</th>
                    <th className="px-6 py-4 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Time execution</th>
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

      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">Add System User</h2>
                <UserIcon className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleAddUser} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="newUserName" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Full Name</label>
                  <input id="newUserName" type="text" title="Full Name" placeholder="Full Name" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newUserEmail" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
                  <input id="newUserEmail" type="email" title="Email" placeholder="Email Address" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newUserPassword" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Password</label>
                  <input id="newUserPassword" type="password" title="Password" placeholder="••••••••" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newUserRole" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Role</label>
                  <select id="newUserRole" title="Role" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none">
                    <option value="ADMIN">Administrator</option>
                    <option value="TREASURER">Treasurer</option>
                    <option value="SECRETARY">Secretary</option>
                    <option value="MEMBER">Regular Member</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black uppercase tracking-widest">Add User</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
