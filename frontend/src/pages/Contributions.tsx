import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Wallet, HeartPulse, History, CheckCircle2, ShieldCheck, ShieldAlert, Clock, HandCoins } from 'lucide-react';
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
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  timestamp: string;
  confirmedAt?: string;
  confirmedBy?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const Contributions = () => {
  const { t } = useTranslation();
  const { isOnline, settings } = useSettings();
  const { isReadOnly, canConfirm, canWriteFinance, user } = useAuth();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<'history' | 'verify'>('history');
  
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const [newContrib, setNewContrib] = useState({
    memberId: '',
    contributorName: '',
    shareAmount: settings.baseShareAmount.toString(),
    emergencyAmount: settings.baseEmergencyAmount.toString(),
    month: currentMonthIdx + 1,
    year: currentYear,
    isAdvance: false,
    recordBoth: true
  });



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
    if (isReadOnly || !canWriteFinance) return;

    const checkDuplicate = (type: 'SHARE' | 'EMERGENCY') => {
      return contributions.find(c => 
        c.memberId === newContrib.memberId && 
        c.contributorName === newContrib.contributorName &&
        c.type === type &&
        c.month === newContrib.month &&
        c.year === newContrib.year
      );
    };

    if (newContrib.recordBoth && (checkDuplicate('SHARE') || checkDuplicate('EMERGENCY'))) {
      alert('A contribution for this month already exists.');
      return;
    }

    const selectedMember = members.find(m => m.id === newContrib.memberId);
    const timestamp = new Date().toISOString();
    const newRecords: Contribution[] = [];

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
      status: 'PENDING',
      timestamp
    };
    newRecords.push(shareRecord);

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
        status: 'PENDING',
        timestamp
      };
      newRecords.push(emergencyRecord);
    }

    const updated = [...newRecords, ...contributions];
    setContributions(updated);
    await setSetting('contributions', updated);
    
    if (!isOnline) {
      for (const rec of newRecords) await addToSyncQueue('CREATE', 'contributions', rec);
    }
    
    setIsModalOpen(false);
    setNewContrib({ ...newContrib, memberId: '', contributorName: '' });
  };

  const handleVerify = async (id: string) => {
    if (!canConfirm) return;
    const updated = contributions.map(c => 
      c.id === id ? { ...c, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString(), confirmedBy: user?.name } : c
    );
    setContributions(updated);
    await setSetting('contributions', updated);
    // API Sync logic...
  };

  const handleVerifyAll = async () => {
    if (!canConfirm) return;
    const updated = contributions.map(c => 
      c.status === 'PENDING' ? { ...c, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString(), confirmedBy: user?.name } : c
    );
    setContributions(updated);
    await setSetting('contributions', updated);
  };

  const pendingCount = contributions.filter(c => c.status === 'PENDING').length;
  const filteredContribs = activeView === 'verify' ? contributions.filter(c => c.status === 'PENDING') : contributions;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight">{t('contributions.title')}</h1>
          <p className="text-muted-foreground font-medium">Verified Financial Pool Management.</p>
        </div>
        
        {canWriteFinance && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-2xl hover:opacity-90 shadow-xl shadow-primary/20 transition-all"
          >
            <Plus className="w-5 h-5" />
            Record New Payment
          </button>
        )}


      </div>

      <div className="flex p-1.5 glass rounded-2xl w-fit">
        <button 
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all ${activeView === 'history' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
        >
          <History className="w-4 h-4" /> All history
        </button>
        {canConfirm && (
          <button 
            onClick={() => setActiveView('verify')}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold text-xs transition-all relative ${activeView === 'verify' ? 'bg-primary text-primary-foreground shadow-lg' : 'hover:bg-primary/10'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Verification queue
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-background">
                {pendingCount}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              {activeView === 'verify' ? <ShieldAlert className="text-rose-500" /> : <Wallet className="text-primary" />}
              {activeView === 'verify' ? 'Action required' : 'Contribution ledger'}
            </h2>
            {activeView === 'verify' && pendingCount > 0 && (
              <button 
                onClick={handleVerifyAll}
                className="text-[10px] font-bold capitalize tracking-widest px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
              >
                Confirm total pool ({settings.currency} {contributions.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.amount, 0).toLocaleString()})
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {filteredContribs.map((c) => (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-5 rounded-3xl flex items-center justify-between hover:border-primary/30 transition-all border border-transparent shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${c.type === 'SHARE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {c.type === 'SHARE' ? <Wallet className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      {c.contributorName || c.memberName}
                      <span className={`text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full border ${c.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse'}`}>
                        {c.status.toLowerCase()}
                      </span>
                    </h4>
                    <p className="text-xs font-medium text-muted-foreground">{c.type === 'SHARE' ? 'Share' : 'Emergency'} • {c.monthName} {c.year}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="font-bold text-foreground text-xl">{settings.currency} {c.amount.toLocaleString()}</span>
                    <p className="text-[9px] font-semibold text-muted-foreground capitalize">{new Date(c.timestamp).toLocaleDateString()}</p>
                  </div>
                  {canConfirm && c.status === 'PENDING' && (
                    <button 
                      onClick={() => handleVerify(c.id)}
                      className="p-3 bg-emerald-500 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                      title="Confirm Receipt"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-[2.5rem] bg-primary/5 border border-primary/10">
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2">
              <HandCoins className="text-primary" /> Verified Pool
            </h3>
            <div className="space-y-4">
              <div className="p-5 rounded-[2rem] bg-background border border-border">
                <p className="text-[10px] font-semibold tracking-widest mb-1 text-muted-foreground">Confirmed shares</p>
                <h4 className="text-2xl font-semibold text-emerald-600">
                  {settings.currency} {contributions.filter(c => c.type === 'SHARE' && c.status === 'CONFIRMED').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
                </h4>
              </div>
              <div className="p-5 rounded-[2rem] bg-background border border-border">
                <p className="text-[10px] font-semibold tracking-widest mb-1 text-muted-foreground">Confirmed emergency</p>
                <h4 className="text-2xl font-semibold text-rose-600">
                  {settings.currency} {contributions.filter(c => c.type === 'EMERGENCY' && c.status === 'CONFIRMED').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}
                </h4>
              </div>
              <div className="pt-4 mt-4 border-t border-dashed">
                <div className="flex justify-between items-center text-amber-600">
                  <span className="text-[10px] font-semibold tracking-widest">Pending verification</span>
                  <span className="font-bold">{settings.currency} {contributions.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.amount, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass p-6 rounded-[2.5rem] border border-blue-500/10 bg-blue-500/5">
            <h3 className="font-semibold text-blue-600 text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Treasurer note</h3>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              Verification ensures accountability. As Treasurer, your confirmation marks the official receipt of funds into the physical bank/pool.
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl bg-background rounded-[2.5rem] p-8 border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-semibold mb-8">Record member payment</h2>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold tracking-widest mb-2 text-muted-foreground ml-1">Member</label>
                    <select 
                      required title="Select Member"
                      value={newContrib.memberId}
                      onChange={e => handleMemberChange(e.target.value)}
                      className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    >
                      <option value="">Choose Member</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.fullname}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold capitalize text-muted-foreground ml-1">Month</label>
                    <select 
                      required title="Select Month"
                      value={newContrib.month}
                      onChange={e => setNewContrib({...newContrib, month: parseInt(e.target.value)})}
                      className="w-full px-5 py-3.5 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/20 font-bold"
                    >
                      {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                    <label className="text-[10px] font-semibold text-emerald-600 capitalize mb-2 block">Share amount</label>
                    <input 
                      type="number" title="Share Amount"
                      value={newContrib.shareAmount}
                      onChange={e => setNewContrib({...newContrib, shareAmount: e.target.value})}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                  </div>
                  <div className="p-5 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                    <label className="text-[10px] font-semibold text-rose-600 capitalize mb-2 block">Emergency amount</label>
                    <input 
                      type="number" title="Emergency Amount"
                      value={newContrib.emergencyAmount}
                      onChange={e => setNewContrib({...newContrib, emergencyAmount: e.target.value})}
                      className="w-full bg-transparent text-xl font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold capitalize tracking-widest">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold capitalize tracking-widest shadow-xl shadow-primary/20">Submit for verification</button>
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
