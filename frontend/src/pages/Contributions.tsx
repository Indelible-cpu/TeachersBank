import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, HeartPulse, History, UserRound, Lock, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';

interface Member {
  id: string;
  fullname: string;
  memberNumber: string;
  alternativeNames?: string;
}

interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  contributorName?: string;
  type: 'SHARE' | 'EMERGENCY';
  amount: number;
  month: number;
  monthName: string;
  year: number;
  isAdvance: boolean;
  timestamp: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Contributions = () => {
  const { t } = useTranslation();
  const { isOnline } = useSettings();
  const { isReadOnly } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const currentYear = new Date().getFullYear();
  
  const [newContrib, setNewContrib] = useState({
    memberId: '',
    contributorName: '',
    shareAmount: '50000',
    emergencyAmount: '5000',
    month: currentMonthIdx + 1,
    year: currentYear,
    isAdvance: false,
    recordBoth: true
  });

  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedMembers = await getSetting('members');
      if (cachedMembers && isMounted) setMembers(cachedMembers);
      
      const cachedContribs = await getSetting('contributions');
      if (cachedContribs && isMounted) {
        setContributions(cachedContribs);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleMemberChange = (id: string) => {
    const member = members.find(m => m.id === id);
    setNewContrib({
      ...newContrib,
      memberId: id,
      contributorName: member?.fullname || ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setError('');

    // Check for duplicates
    const checkDuplicate = (type: 'SHARE' | 'EMERGENCY') => {
      return contributions.find(c => 
        c.memberId === newContrib.memberId && 
        c.contributorName === newContrib.contributorName &&
        c.type === type &&
        c.month === newContrib.month &&
        c.year === newContrib.year
      );
    };

    if (newContrib.recordBoth) {
      if (checkDuplicate('SHARE') || checkDuplicate('EMERGENCY')) {
        setError('A contribution for this month/year already exists for this name.');
        return;
      }
    }

    const selectedMember = members.find(m => m.id === newContrib.memberId);
    const timestamp = new Date().toISOString();
    
    const newRecords: Contribution[] = [];

    // Share record
    const shareRecord: Contribution = {
      id: `S-${Date.now()}`,
      memberId: newContrib.memberId,
      memberName: selectedMember?.fullname || 'Unknown',
      contributorName: newContrib.contributorName,
      type: 'SHARE',
      amount: parseFloat(newContrib.shareAmount),
      month: newContrib.month,
      monthName: MONTHS[newContrib.month - 1],
      year: newContrib.year,
      isAdvance: newContrib.isAdvance,
      timestamp
    };
    newRecords.push(shareRecord);

    // Emergency record
    if (newContrib.recordBoth) {
      const emergencyRecord: Contribution = {
        id: `E-${Date.now() + 1}`,
        memberId: newContrib.memberId,
        memberName: selectedMember?.fullname || 'Unknown',
        contributorName: newContrib.contributorName,
        type: 'EMERGENCY',
        amount: parseFloat(newContrib.emergencyAmount),
        month: newContrib.month,
        monthName: MONTHS[newContrib.month - 1],
        year: newContrib.year,
        isAdvance: newContrib.isAdvance,
        timestamp
      };
      newRecords.push(emergencyRecord);
    }

    const updated = [...newRecords, ...contributions];
    setContributions(updated);
    await setSetting('contributions', updated);
    
    if (isOnline) {
      // API Sync...
    } else {
      for (const rec of newRecords) {
        await addToSyncQueue('CREATE', 'contributions', rec);
      }
    }
    
    setIsModalOpen(false);
    setNewContrib({ ...newContrib, memberId: '', contributorName: '' });
  };

  const selectedMemberData = members.find(m => m.id === newContrib.memberId);
  const alternativeNamesList = selectedMemberData?.alternativeNames?.split(',').map(n => n.trim()).filter(Boolean) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('contributions.title')}</h1>
          <p className="text-muted-foreground">Automatic 1-to-1 tracking for Share & Emergency funds.</p>
        </div>
        
        {!isReadOnly ? (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 hover:scale-[1.02] transition-all shadow-xl shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Unified Entry
          </button>
        ) : (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-muted-foreground font-medium rounded-xl border border-dashed">
            <Lock className="w-4 h-4" />
            Read Only Access
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">{t('contributions.history')}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Paid
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
                <AlertCircle className="w-3 h-3" /> Unpaid
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {contributions.length === 0 && (
              <div className="p-12 glass rounded-3xl text-center">
                <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">No contributions recorded yet.</p>
              </div>
            )}
            {contributions.map((c, i) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass p-4 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all border border-transparent"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl shadow-sm ${c.type === 'SHARE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {c.type === 'SHARE' ? <Wallet className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {c.contributorName || c.memberName}
                      {c.isAdvance && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-tighter">
                          Advance
                        </span>
                      )}
                    </h4>
                    <p className="text-xs font-medium text-muted-foreground">
                      {c.type === 'SHARE' ? 'Share Contribution' : 'Emergency Fund'} • {c.monthName} {c.year}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-foreground text-lg">MWK {c.amount.toLocaleString()}</span>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">{new Date(c.timestamp).toLocaleDateString()}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-3xl shadow-sm border border-primary/5">
            <h3 className="font-bold mb-4 text-lg flex items-center gap-2">
              <div className="w-2 h-6 bg-primary rounded-full" />
              Cycle Summary
            </h3>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Total Share Pool</p>
                <h4 className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                  <span className="text-sm font-medium mr-1 text-emerald-500">MWK</span>
                  {contributions.filter(c => c.type === 'SHARE').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
                </h4>
              </div>
              <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 transition-all hover:bg-rose-500/10">
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">Total Emergency Pool</p>
                <h4 className="text-3xl font-black text-rose-700 dark:text-rose-300">
                  <span className="text-sm font-medium mr-1 text-rose-500">MWK</span>
                  {contributions.filter(c => c.type === 'EMERGENCY').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
                </h4>
              </div>
            </div>
          </div>
          
          <div className="glass p-6 rounded-3xl border border-blue-500/10 bg-blue-500/5">
            <h3 className="font-bold mb-2 text-blue-600 dark:text-blue-400">Activity Info</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              System is currently tracking all activities. Each entry creates a secure audit trail for transparency.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-background rounded-[2.5rem] p-8 shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tight">Record Contribution</h2>
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
                  Unified Form
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-black uppercase tracking-wider text-muted-foreground ml-1" htmlFor="member-select">Member</label>
                    <select 
                      id="member-select"
                      title="Select Member"
                      required
                      value={newContrib.memberId}
                      onChange={e => handleMemberChange(e.target.value)}
                      className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 transition-all appearance-none font-bold"
                    >
                      <option value="">Choose Member</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.fullname} ({m.memberNumber})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-black uppercase tracking-wider text-muted-foreground ml-1" htmlFor="month-select">Period (Month)</label>
                    <select 
                      id="month-select"
                      title="Select Month"
                      required
                      value={newContrib.month}
                      onChange={e => setNewContrib({...newContrib, month: parseInt(e.target.value)})}
                      className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 transition-all appearance-none font-bold"
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {newContrib.memberId && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                    <label className="block text-sm font-black uppercase tracking-wider text-muted-foreground ml-1">Contribute as:</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setNewContrib({...newContrib, contributorName: selectedMemberData?.fullname || ''})}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${newContrib.contributorName === selectedMemberData?.fullname ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-secondary/50 border-transparent hover:bg-secondary'}`}
                      >
                        {selectedMemberData?.fullname}
                      </button>
                      {alternativeNamesList.map(name => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setNewContrib({...newContrib, contributorName: name})}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${newContrib.contributorName === name ? 'bg-primary border-primary text-primary-foreground shadow-lg' : 'bg-secondary/50 border-transparent hover:bg-secondary'}`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className="p-6 rounded-3xl bg-secondary/30 border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-500" />
                      <span className="font-bold">Share Contribution</span>
                    </div>
                    <input 
                      title="Share Amount"
                      type="number" 
                      required
                      value={newContrib.shareAmount}
                      onChange={e => setNewContrib({...newContrib, shareAmount: e.target.value})}
                      className="w-32 px-3 py-1.5 bg-background rounded-xl outline-none focus:ring-2 focus:ring-primary text-right font-black"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-5 h-5 text-rose-500" />
                      <span className="font-bold">Emergency Fund</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={newContrib.recordBoth}
                          onChange={e => setNewContrib({...newContrib, recordBoth: e.target.checked})}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-[10px] font-black uppercase">Enable</span>
                      </label>
                      <input 
                        title="Emergency Amount"
                        type="number" 
                        disabled={!newContrib.recordBoth}
                        value={newContrib.emergencyAmount}
                        onChange={e => setNewContrib({...newContrib, emergencyAmount: e.target.value})}
                        className={`w-32 px-3 py-1.5 bg-background rounded-xl outline-none focus:ring-2 focus:ring-primary text-right font-black ${!newContrib.recordBoth && 'opacity-30'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <input 
                      id="advance-pay"
                      type="checkbox" 
                      checked={newContrib.isAdvance}
                      onChange={e => setNewContrib({...newContrib, isAdvance: e.target.checked})}
                      className="w-5 h-5 rounded-lg border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="advance-pay" className="text-sm font-bold cursor-pointer">Support as Advance Payment</label>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total to Pay</p>
                    <p className="text-xl font-black text-primary">MWK {(parseFloat(newContrib.shareAmount || '0') + (newContrib.recordBoth ? parseFloat(newContrib.emergencyAmount || '0') : 0)).toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-black uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all"
                  >
                    Confirm & Record
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

export default Contributions;
