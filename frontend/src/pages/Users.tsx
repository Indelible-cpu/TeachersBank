import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Users as UsersIcon, Eye, EyeOff, Trash2 } from 'lucide-react';
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
  member?: {
    memberNumber: string;
    phone?: string;
    address?: string;
    gender?: string;
  } | null;
}

const Users = () => {
  const { user: currentUser, updateUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', nationalId: '', password: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [deletingUserTarget, setDeletingUserTarget] = useState<User | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  }, []);

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

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };



  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (newPassword.trim().length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    try {
      await api.post(`/users/${resettingUser.id}/reset-password`, { password: newPassword });
      toast.success(`Password reset successfully for ${resettingUser.name}`);
      setResettingUser(null);
      setNewPassword('');
      setShowResetPassword(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const cleanNid = editForm.nationalId.trim().toUpperCase();
    if (cleanNid && !/^[A-Z0-9]{8}$/.test(cleanNid)) {
      toast.error('National ID must be exactly 8 alphanumeric characters in uppercase.');
      return;
    }
    try {
      const finalName = cleanNid ? `${toTitleCase(editForm.name)}|NID:${cleanNid}` : toTitleCase(editForm.name);
      await api.patch(`/users/${editingUser.id}`, { name: finalName, email: editForm.email });
      if (editForm.password.trim()) {
        if (editForm.password.trim().length < 6) {
          toast.error('Password must be at least 6 characters long');
          return;
        }
        await api.post(`/users/${editingUser.id}/reset-password`, { password: editForm.password });
      }
      toast.success('Details updated successfully');
      // If the user edited their own account, update the global auth context immediately
      if (editingUser.id === currentUser?.id) {
        await updateUser({ name: finalName, email: editForm.email });
      }
      setEditingUser(null);
      fetchData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to update details');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (u.id === currentUser?.id) {
      toast.error('You cannot delete your own account');
      return;
    }
    setDeletingUserTarget(u);
  };

  if (currentUser?.role !== 'ADMIN') {
    return <div className="p-8 text-center font-bold">Access Denied</div>;
  }

  const filteredUsers = users;

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-8">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            System Users Directory
          </h1>
          <p className="text-muted-foreground font-medium italic">Manage user privileges and credentials.</p>
        </div>
      </div>

      {/* Grid List */}
      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredUsers.map((u) => (
          <div key={u.id} className="glass rounded-[2rem] p-6 flex flex-col gap-5 border border-transparent hover:border-primary/20 transition-all shadow-sm">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${u.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {u.role === 'ADMIN' ? <ShieldAlert /> : u.role === 'TREASURER' ? <ShieldCheck /> : u.role === 'SECRETARY' ? <Shield /> : <UserIcon />}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleStatus(u)}
                  className={`text-[9px] font-semibold px-2.5 py-1 rounded-full capitalize tracking-widest border transition-all ${u.isActive ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/5 text-rose-500 border-rose-500/20'}`}
                >
                  {u.isActive ? 'Active' : 'Suspended'}
                </button>
                <button 
                  onClick={() => {
                    const hasNid = u.name.includes('|NID:');
                    const displayName = hasNid ? u.name.split('|NID:')[0] : u.name;
                    const nationalId = hasNid ? u.name.split('|NID:')[1] : '';
                    setShowEditPassword(false);
                    setEditingUser(u);
                    setEditForm({ name: displayName, email: u.email, nationalId: nationalId, password: '' });
                  }}
                  className="text-[9px] font-semibold px-2.5 py-1 rounded-full capitalize tracking-widest border transition-all bg-secondary/80 text-foreground border-border hover:bg-secondary"
                >
                  Edit Info
                </button>
                <button 
                  onClick={() => {
                    setResettingUser(u);
                    setNewPassword('');
                    setShowResetPassword(false);
                  }}
                  className="text-[9px] font-semibold px-2.5 py-1 rounded-full capitalize tracking-widest border transition-all bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-primary-foreground"
                >
                  Reset Pass
                </button>
                {u.id !== currentUser?.id && (
                  <button 
                    onClick={() => handleDeleteUser(u)}
                    className="text-[9px] font-semibold px-2.5 py-1 rounded-full capitalize tracking-widest border transition-all bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            <div>
              {(() => {
                const hasNid = u.name.includes('|NID:');
                const displayName = hasNid ? u.name.split('|NID:')[0] : u.name;
                const nationalId = hasNid ? u.name.split('|NID:')[1] : '';
                return (
                  <>
                    <h3 className="font-black text-xl leading-tight">{displayName}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{u.email}</p>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {nationalId && (
                        <span className="text-[9px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full tracking-wider">
                          NID: {nationalId}
                        </span>
                      )}
                      {u.member?.memberNumber && (
                        <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full tracking-wider">
                          MEMBER ID: {u.member.memberNumber}
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
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
                <option value="TREASURER">Treasurer</option>
                <option value="SECRETARY">Secretary</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>
          </div>
        ))}
      </motion.div>

      {/* MODALS */}
      <AnimatePresence>


        {/* Reset Password Modal */}
        {resettingUser && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setResettingUser(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">Reset Password</h2>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-primary/10 text-primary">{resettingUser.name}</span>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="resetUserPassword" className="text-xs font-black text-muted-foreground ml-1">New Password</label>
                  <div className="relative">
                    <input 
                      id="resetUserPassword" 
                      type={showResetPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      required 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                      className="w-full pl-5 pr-12 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" 
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
                    >
                      {showResetPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setResettingUser(null)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black hover:shadow-xl hover:shadow-primary/20 transition-all">Reset Password</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit User Details Modal */}
        {editingUser && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setEditingUser(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">{editingUser.role === 'MEMBER' ? 'Edit Member Details' : 'Edit Staff Details'}</h2>
                <UserIcon className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                 <div className="space-y-2">
                  <label htmlFor="editUserName" className="text-xs font-black text-muted-foreground ml-1">Full Name</label>
                  <input id="editUserName" type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editUserNationalId" className="text-xs font-black text-muted-foreground ml-1">National ID (Optional)</label>
                  <input id="editUserNationalId" type="text" placeholder="e.g. ABC12345" value={editForm.nationalId} onChange={e => setEditForm({...editForm, nationalId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" maxLength={8} />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editUserEmail" className="text-xs font-black text-muted-foreground ml-1">Email</label>
                  <input id="editUserEmail" type="email" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="editUserPassword" className="text-xs font-black text-muted-foreground ml-1">New Password (Optional - Leave blank to keep current)</label>
                  <div className="relative">
                    <input 
                      id="editUserPassword" 
                      type={showEditPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={editForm.password} 
                      onChange={e => setEditForm({...editForm, password: e.target.value})} 
                      className="w-full pl-5 pr-12 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
                    >
                      {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black hover:shadow-xl hover:shadow-primary/20 transition-all">Save Changes</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingUserTarget && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setDeletingUserTarget(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight">{deletingUserTarget.role === 'MEMBER' ? 'Delete Member' : 'Delete Staff Member'}</h2>
                <p className="text-muted-foreground text-sm font-semibold">
                  Are you sure you want to permanently delete {deletingUserTarget.role === 'MEMBER' ? 'member' : 'staff member'} <span className="font-bold text-foreground">{deletingUserTarget.name.split('|NID:')[0]}</span>? This action cannot be undone and will delete all their associated records.
                </p>
              </div>

              <div className="flex gap-4 pt-8">
                <button 
                  type="button" 
                  onClick={() => setDeletingUserTarget(null)}
                  className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    try {
                      await api.delete(`/users/${deletingUserTarget.id}`);
                      setUsers(users.filter(user => user.id !== deletingUserTarget.id));
                      toast.success(`${deletingUserTarget.role === 'MEMBER' ? 'Member' : 'User'} deleted successfully`);
                    } catch (error: unknown) {
                      const err = error as { response?: { data?: { error?: string } } };
                      toast.error(err.response?.data?.error || 'Failed to delete user');
                    } finally {
                      setDeletingUserTarget(null);
                    }
                  }}
                  className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-[1.25rem] font-black hover:bg-destructive/90 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;
