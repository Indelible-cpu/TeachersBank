import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Plus, Phone, Calendar, UserRound, Lock } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Member {
  id: string;
  fullname: string;
  alternativeNames?: string;
  memberNumber: string;
  phone: string;
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
    alternativeNames: ''
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cached = await getSetting('members');
      if (cached && isMounted) {
        setMembers(cached);
      } else if (isMounted) {
        const initial = [
          { id: '1', fullname: 'John Banda', memberNumber: 'M001', phone: '+265 99 123 4567', joinDate: '2025-01-10', alternativeNames: 'JB, Banda J' },
          { id: '2', fullname: 'Mary Phiri', memberNumber: 'M002', phone: '+265 88 765 4321', joinDate: '2025-02-15', alternativeNames: 'Mary P' }
        ];
        setMembers(initial);
        await setSetting('members', initial);
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
      alternativeNames: newMember.alternativeNames,
      joinDate: new Date().toISOString().split('T')[0]
    };
    
    const updated = [...members, member];
    setMembers(updated);
    await setSetting('members', updated);
    
    if (isOnline) {
      // API Call
    } else {
      await addToSyncQueue('CREATE', 'members', member);
    }
    
    setIsModalOpen(false);
    setNewMember({ fullname: '', memberNumber: '', phone: '', alternativeNames: '' });
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
          <p className="text-muted-foreground">Manage your organization's members.</p>
        </div>
        
        {!isReadOnly ? (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
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
          type="text" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('members.search')}
          className="w-full pl-12 pr-4 py-3.5 bg-secondary/50 border-0 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all glass"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredMembers.map((member, i) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                {member.fullname.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-tight">{member.fullname}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">
                  {member.memberNumber}
                </span>
              </div>
            </div>

            {member.alternativeNames && (
              <div className="flex items-start gap-2 text-xs bg-secondary/30 p-2 rounded-lg">
                <UserRound className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground italic truncate">Also: {member.alternativeNames}</span>
              </div>
            )}
            
            <div className="space-y-2 pt-4 border-t border-border/50 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {member.phone || 'N/A'}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Joined: {member.joinDate}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-background rounded-3xl p-6 shadow-xl border border-border"
          >
            <h2 className="text-xl font-bold mb-6">{t('members.add_member')}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('members.fullname')}</label>
                <input 
                  type="text" 
                  required
                  value={newMember.fullname}
                  onChange={e => setNewMember({...newMember, fullname: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Official Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Alternative Names (comma separated)</label>
                <input 
                  type="text" 
                  value={newMember.alternativeNames}
                  onChange={e => setNewMember({...newMember, alternativeNames: e.target.value})}
                  className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g. Nickname, Business Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('members.member_number')}</label>
                  <input 
                    type="text" 
                    required
                    value={newMember.memberNumber}
                    onChange={e => setNewMember({...newMember, memberNumber: e.target.value})}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="M001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('members.phone')}</label>
                  <input 
                    type="tel" 
                    value={newMember.phone}
                    onChange={e => setNewMember({...newMember, phone: e.target.value})}
                    className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    placeholder="+265..."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium"
                >
                  {t('members.save')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Members;
