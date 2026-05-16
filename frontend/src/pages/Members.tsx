import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Phone, Calendar, UserRound, Lock, User as UserIcon, MapPin } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Member {
  id: string;
  fullname: string;
  alternativeNames?: string;
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
  const { isReadOnly } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({ 
    fullname: '', 
    memberNumber: '', 
    phone: '',
    phone2: '',
    gender: 'MALE',
    address: '',
    alternativeNames: ''
  });

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const member: Member = {
      id: Date.now().toString(),
      fullname: newMember.fullname,
      memberNumber: newMember.memberNumber,
      phone: newMember.phone,
      phone2: newMember.phone2,
      gender: newMember.gender,
      address: newMember.address,
      alternativeNames: newMember.alternativeNames,
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    const updated = [...members, member];
    setMembers(updated);
    await setSetting('members', updated);
    
    if (!isOnline) {
      await addToSyncQueue('CREATE', 'members', member);
    }
    
    setIsModalOpen(false);
    setNewMember({ 
      fullname: '', memberNumber: '', phone: '', phone2: '', 
      gender: 'MALE', address: '', alternativeNames: '' 
    });
  };

  const filteredMembers = members.filter(m => 
    m.fullname.toLowerCase().includes(search.toLowerCase()) || 
    m.memberNumber.toLowerCase().includes(search.toLowerCase()) ||
    (m.alternativeNames && m.alternativeNames.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('members.title')}</h1>
          <p className="text-muted-foreground">Comprehensive member directory with dual phone support.</p>
        </div>
        
        {!isReadOnly ? (
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
            Read Only Access
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
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-primary text-primary-foreground uppercase tracking-wider">
                    {member.memberNumber}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${member.gender === 'FEMALE' ? 'bg-pink-500/10 text-pink-600' : 'bg-blue-500/10 text-blue-600'}`}>
                    {member.gender}
                  </span>
                </div>
              </div>
            </div>

            {member.alternativeNames && (
              <div className="flex items-start gap-2 text-xs bg-secondary/30 p-3 rounded-xl border border-white/5">
                <UserRound className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground italic font-medium">Identity: {member.alternativeNames}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-border/50 text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-secondary/50"><Phone className="w-4 h-4" /></div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground leading-tight">{member.phone}</span>
                  {member.phone2 && <span className="text-[10px] opacity-70 font-medium">Alt: {member.phone2}</span>}
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
                <span className="font-medium text-[12px] uppercase tracking-wide">Joined: {new Date(member.joinDate).toLocaleDateString()}</span>
              </div>
            </div>
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
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="fullname">Full Name</label>
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
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="gender">Gender</label>
                    <select 
                      id="gender"
                      title="Select Gender"
                      value={newMember.gender}
                      onChange={e => setNewMember({...newMember, gender: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="alt-names">Alternative Names</label>
                  <input 
                    id="alt-names"
                    type="text" 
                    value={newMember.alternativeNames}
                    onChange={e => setNewMember({...newMember, alternativeNames: e.target.value})}
                    className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-medium"
                    placeholder="Nicknames, Business Names (Comma separated)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="member-id">Member ID</label>
                    <input 
                      id="member-id"
                      type="text" 
                      required
                      value={newMember.memberNumber}
                      onChange={e => setNewMember({...newMember, memberNumber: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-black uppercase"
                      placeholder="M001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="address">Address</label>
                    <input 
                      id="address"
                      type="text" 
                      value={newMember.address}
                      onChange={e => setNewMember({...newMember, address: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-medium"
                      placeholder="City, Area"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="phone-1">Primary Phone</label>
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
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1" htmlFor="phone-2">Secondary Phone</label>
                    <input 
                      id="phone-2"
                      type="tel" 
                      value={newMember.phone2}
                      onChange={e => setNewMember({...newMember, phone2: e.target.value})}
                      className="w-full px-5 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold"
                      placeholder="+265..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-[1.25rem] font-black uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-[1.25rem] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/20 transition-all"
                  >
                    {t('members.save')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Members;
