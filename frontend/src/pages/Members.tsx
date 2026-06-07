import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Phone, Calendar, Lock, User as UserIcon, MapPin, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/useToast';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';
import api from '../services/api';

interface Member {
  id: string;
  fullname: string;
  memberNumber: string;
  phone: string;
  phone2?: string;
  gender: string;
  address?: string;
  joinDate: string;
}

const Members = () => {
  const { t } = useTranslation();
  const { isOnline } = useSettings();
  const { user } = useAuth();
  const toast = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ 
    fullname: '', 
    phone: '',
    gender: 'MALE',
    address: '',
    email: '',
    nationalId: ''
  });
  const [generatedCredentials, setGeneratedCredentials] = useState<{ password: string; phone: string; email: string } | null>(null);

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editForm, setEditForm] = useState({
    fullname: '',
    phone: '',
    gender: 'MALE',
    address: '',
    nationalId: '',
    email: '',
    password: ''
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  const canAddMember = user?.role === 'SECRETARY';

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cached = await getSetting('members');
      if (cached && isMounted) {
        setMembers(cached);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const toTitleCase = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAddMember) return;

    // Validate phone number: must be between 10 and 13 digits only
    const digitsOnly1 = newMember.phone.replace(/\D/g, '');
    if (digitsOnly1.length < 10 || digitsOnly1.length > 13) {
      toast.error('Primary phone number must contain between 10 and 13 digits only.');
      return;
    }

    // Validate optional National ID: exactly 8 characters in uppercase
    const cleanNid = newMember.nationalId.trim().toUpperCase();
    if (cleanNid && !/^[A-Z0-9]{8}$/.test(cleanNid)) {
      toast.error('National ID must be exactly 8 alphanumeric characters in uppercase.');
      return;
    }

    // Validate required email
    if (!newMember.email || !newMember.email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (isOnline) {
      try {
        await api.get(`/users/check-email?email=${encodeURIComponent(newMember.email.toLowerCase().trim())}`);
      } catch (err: any) {
        // Only block if the server explicitly says the email is taken (400)
        if (err.response?.status === 400) {
          toast.error(err.response.data?.error || 'This email address is already registered.');
          return;
        }
        // On server errors (500) or network failures, allow proceeding — backend will enforce on sync
        console.warn('Email check failed, proceeding anyway:', err.message);
      }
    } else {
      // Basic local check for offline mode using cached members list
      if (members.some((m: any) => (m.email || '').toLowerCase() === newMember.email.toLowerCase().trim())) {
        toast.error('This email address is already registered locally.');
        return;
      }
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    // Generate auto-assigned Member Number
    const generatedMemberNo = `MBR-${Math.floor(100000 + Math.random() * 900000)}`;

    const member: Member = {
      id: Date.now().toString(),
      fullname: toTitleCase(newMember.fullname),
      memberNumber: generatedMemberNo,
      phone: newMember.phone,
      phone2: cleanNid || undefined, // store optional National ID in phone2
      gender: newMember.gender,
      address: newMember.address,
      joinDate: new Date().toISOString().split('T')[0],
      // Transient properties parsed by the sync route to register their User account
      email: newMember.email,
      password: tempPassword
    } as any;
    
    const updated = [...members, member];
    setMembers(updated);
    await setSetting('members', updated);
    
    if (!isOnline) {
      await addToSyncQueue('CREATE', 'members', member);
    } else {
      await addToSyncQueue('CREATE', 'members', member);
    }
    
    toast.success(`Member registered successfully with ID: ${generatedMemberNo}`);
    setIsModalOpen(false);
    setGeneratedCredentials({ password: tempPassword, phone: newMember.phone, email: newMember.email }); // Show modal with actions
    setNewMember({ 
      fullname: '', phone: '', gender: 'MALE', address: '', 
      email: '', nationalId: ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    // Validate phone number
    const digitsOnly = editForm.phone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13) {
      toast.error('Primary phone number must contain between 10 and 13 digits only.');
      return;
    }

    // Validate optional National ID
    const cleanNid = editForm.nationalId.trim().toUpperCase();
    if (cleanNid && !/^[A-Z0-9]{8}$/.test(cleanNid)) {
      toast.error('National ID must be exactly 8 alphanumeric characters in uppercase.');
      return;
    }

    // Optional Email/Password updates if they want to modify login details
    if (editForm.email && !editForm.email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    // Update member record in memory and in IndexedDB
    const updatedMember = {
      ...editingMember,
      fullname: toTitleCase(editForm.fullname),
      phone: editForm.phone,
      phone2: cleanNid || undefined,
      gender: editForm.gender,
      address: editForm.address,
      email: editForm.email || undefined,
      password: editForm.password || undefined
    };

    const updatedList = members.map(m => m.id === editingMember.id ? updatedMember : m);
    setMembers(updatedList);
    await setSetting('members', updatedList);

    // Queue sync update mutation
    await addToSyncQueue('UPDATE', 'members', updatedMember);

    toast.success('Member details updated successfully');
    setEditingMember(null);
  };

  const filteredMembers = members.filter(m => 
    m.fullname.toLowerCase().includes(search.toLowerCase()) || 
    m.memberNumber.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('members.title')}</h1>
          <p className="text-muted-foreground">{t('members.subtitle', 'Comprehensive member directory with dual phone support.')}</p>
        </div>
        
        {canAddMember ? (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            {t('members.add_member')}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-muted-foreground font-medium rounded-xl border border-dashed">
            <Lock className="w-4 h-4" />
            {t('members.view_only', 'View Only Access')}
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input 
          title="Search Members"
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('members.search')}
          className="w-full pl-12 pr-4 py-4 bg-secondary/50 border-0 rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all glass font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member, i) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-3xl p-6 flex flex-col gap-5 hover:border-primary/30 transition-all group border border-transparent shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner">
                {member.fullname.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h3 className="font-bold text-lg leading-tight truncate">{member.fullname}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary text-primary-foreground capitalize tracking-widest">
                    {member.memberNumber}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground capitalize tracking-widest block mb-1">{t('members.status', 'Status')}</span>
                  <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs capitalize">
                    <ShieldCheck className="w-4 h-4" /> {t('members.active', 'Active')}
                  </div>
                </div>
              </div>
            </div>


            
            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-border/50 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-secondary/50"><Phone className="w-4 h-4" /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground leading-tight">{member.phone}</span>
                  {member.phone2 && <span className="text-[10px] opacity-75 font-black text-primary tracking-wider uppercase">NID: {member.phone2}</span>}
                </div>
              </div>
              {member.address && (
                <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-lg bg-secondary/50"><MapPin className="w-4 h-4" /></div>
                  <span className="truncate font-medium">{member.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-secondary/50"><Calendar className="w-4 h-4" /></div>
                <span className="font-medium text-[12px] uppercase tracking-wide">{t('members.joined', 'Joined')}: {new Date(member.joinDate).toLocaleDateString()}</span>
              </div>
            </div>

            {canAddMember && (
              <div className="pt-3 border-t border-border/30 flex justify-end">
                <button
                  onClick={() => {
                    setEditingMember(member);
                    setEditForm({
                      fullname: member.fullname,
                      phone: member.phone,
                      gender: member.gender,
                      address: member.address || '',
                      nationalId: member.phone2 || '',
                      email: (member as any).email || '',
                      password: ''
                    });
                  }}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-full capitalize tracking-widest border transition-all bg-secondary/80 text-foreground border-border hover:bg-secondary"
                >
                  {t('members.edit_info', 'Edit Info')}
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

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
                <h2 className="text-2xl font-black tracking-tight">{t('members.add_member')}</h2>
                <UserIcon className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="fullname">{t('members.fullname')}</label>
                    <input 
                      id="fullname"
                      type="text" 
                      required
                      value={newMember.fullname}
                      onChange={e => setNewMember({...newMember, fullname: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="Official Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="gender">{t('members.gender', 'Gender')}</label>
                    <select 
                      id="gender"
                      title="Select Gender"
                      value={newMember.gender}
                      onChange={e => setNewMember({...newMember, gender: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none"
                    >
                      <option value="MALE">{t('members.male', 'Male')}</option>
                      <option value="FEMALE">{t('members.female', 'Female')}</option>
                    </select>
                  </div>
                </div>



                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="address">{t('members.address', 'Address')}</label>
                    <input 
                      id="address"
                      type="text" 
                      value={newMember.address}
                      onChange={e => setNewMember({...newMember, address: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-medium"
                      placeholder="City, Area"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="national-id">{t('members.national_id', 'National ID (Optional)')}</label>
                    <input 
                      id="national-id"
                      type="text" 
                      value={newMember.nationalId}
                      onChange={e => setNewMember({...newMember, nationalId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      maxLength={8}
                      placeholder="8 characters"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="phone-1">{t('members.primary_phone', 'Primary Phone')}</label>
                    <input 
                      id="phone-1"
                      type="tel" 
                      required
                      value={newMember.phone}
                      onChange={e => setNewMember({...newMember, phone: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="+265..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="member-email">{t('members.email', 'Email Address')}</label>
                    <input 
                      id="member-email"
                      type="email" 
                      required
                      value={newMember.email}
                      onChange={e => setNewMember({...newMember, email: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="member@teachersbank.com"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all"
                  >
                    {t('members.cancel', 'Cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black hover:shadow-xl hover:shadow-primary/20 transition-all"
                  >
                    {t('members.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setEditingMember(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">{t('members.edit_member', 'Edit Member Details')}</h2>
                <UserIcon className="w-8 h-8 text-primary/20" />
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-fullname">{t('members.fullname')}</label>
                    <input 
                      id="edit-fullname"
                      type="text" 
                      required
                      value={editForm.fullname}
                      onChange={e => setEditForm({...editForm, fullname: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="Official Name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-gender">{t('members.gender', 'Gender')}</label>
                    <select 
                      id="edit-gender"
                      title="Select Gender"
                      value={editForm.gender}
                      onChange={e => setEditForm({...editForm, gender: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none"
                    >
                      <option value="MALE">{t('members.male', 'Male')}</option>
                      <option value="FEMALE">{t('members.female', 'Female')}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-address">{t('members.address', 'Address')}</label>
                    <input 
                      id="edit-address"
                      type="text" 
                      value={editForm.address}
                      onChange={e => setEditForm({...editForm, address: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-medium"
                      placeholder="City, Area"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-national-id">{t('members.national_id', 'National ID (Optional)')}</label>
                    <input 
                      id="edit-national-id"
                      type="text" 
                      value={editForm.nationalId}
                      onChange={e => setEditForm({...editForm, nationalId: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      maxLength={8}
                      placeholder="8 characters"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-phone">{t('members.primary_phone', 'Primary Phone')}</label>
                    <input 
                      id="edit-phone"
                      type="tel" 
                      required
                      value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="+265..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-email">{t('members.email', 'Email Address')}</label>
                    <input 
                      id="edit-email"
                      type="email" 
                      required
                      value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="member@teachersbank.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-muted-foreground ml-1" htmlFor="edit-password">{t('members.new_password_optional', 'New Password (Optional - Leave blank to keep current)')}</label>
                  <div className="relative">
                    <input 
                      id="edit-password"
                      type={showEditPassword ? "text" : "password"}
                      value={editForm.password}
                      onChange={e => setEditForm({...editForm, password: e.target.value})}
                      className="w-full px-5 py-3 pr-12 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="Enter new password"
                    />
                    <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showEditPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setEditingMember(null)}
                    className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:bg-secondary/80 transition-all"
                  >
                    {t('members.cancel', 'Cancel')}
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black hover:shadow-xl hover:shadow-primary/20 transition-all"
                  >
                    {t('members.save_changes', 'Save Changes')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Generated Password Modal */}
        {generatedCredentials && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setGeneratedCredentials(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/5 text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">{t('members.member_created', 'Member Created!')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('members.member_created_desc', 'The account has been created. Click below to securely send the generated credentials directly to the user.')}</p>
              
              <div className="flex flex-col gap-3 mb-8">
                <a
                  href={`https://wa.me/${generatedCredentials.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Welcome to TeachersBank!\n\nYour account has been created. Please use the details below to log in:\n\nEmail: ${generatedCredentials.email}\nTemporary Password: ${generatedCredentials.password}\n\nYou will be required to change your password upon your first login.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => toast.success('Redirecting to WhatsApp...')}
                  className="w-full py-4 bg-[#25D366] text-white rounded-[1.25rem] font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Phone className="w-5 h-5" /> {t('members.send_whatsapp', 'Send via WhatsApp')}
                </a>
                
                <a
                  href={`mailto:${generatedCredentials.email}?subject=Your TeachersBank Account Details&body=${encodeURIComponent(`Welcome to TeachersBank!\n\nYour account has been created. Please use the details below to log in:\n\nEmail: ${generatedCredentials.email}\nTemporary Password: ${generatedCredentials.password}\n\nYou will be required to change your password upon your first login.`)}`}
                  onClick={() => toast.success('Opening default email client...')}
                  className="w-full py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  {t('members.send_email', 'Send via Email')}
                </a>
              </div>

              <button 
                onClick={() => setGeneratedCredentials(null)}
                className="w-full py-3 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
              >
                {t('members.close', 'Close Window')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Members;
