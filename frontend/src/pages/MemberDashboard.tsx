import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/useSettings';
import { useToast } from '../context/useToast';
import { getSetting, addToSyncQueue, performSync } from '../services/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, CreditCard, Banknote, Calendar, Edit2 } from 'lucide-react';

const MemberDashboard = () => {
  const { user } = useAuth();
  const { settings, isOnline } = useSettings();
  const toast = useToast();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [memberRecord, setMemberRecord] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myLoans, setMyLoans] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myContributions, setMyContributions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [myPledges, setMyPledges] = useState<any[]>([]);
  
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [isPledgeModalOpen, setIsPledgeModalOpen] = useState(false);
  
  const [newLoan, setNewLoan] = useState({ principal: '', ruleId: '' });
  const [newPledge, setNewPledge] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), shareAmount: '', loanRepaymentAmount: '', id: '' });

  const rules = settings.loanDurationRules || [];

  const loadData = async () => {
    if (!user) return;
    
    const members = await getSetting('members') || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = members.find((m: any) => m.userId === user.id || m.email === user.email);
    if (me) {
      setMemberRecord(me);
      
      const loans = await getSetting('loans') || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyLoans(loans.filter((l: any) => l.memberId === me.id));
      
      const contribs = await getSetting('contributions') || [];
      const shares = await getSetting('shareContributions') || [];
      const merged = [...contribs, ...shares];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyContributions(merged.filter((c: any) => c.memberId === me.id && c.type === 'SHARE' && c.status === 'CONFIRMED'));
      
      const pledges = await getSetting('pledges') || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMyPledges(pledges.filter((p: any) => p.memberId === me.id));
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const activeLoan = myLoans.find(l => ['PENDING', 'VERIFIED', 'APPROVED'].includes(l.status));
  const memberShares = myContributions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const handleRequestLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberRecord) return;
    
    if (activeLoan) {
      toast.error('System Rejected: You already have an active loan. You cannot request another until it is fully paid.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rule = rules.find((r: any) => r.id === newLoan.ruleId);
    if (!rule) { toast.error('Select a loan rule'); return; }
    
    const principal = parseFloat(newLoan.principal);
    if (principal < rule.minAmount || principal > rule.maxAmount) {
      toast.error(`Amount must be between ${rule.minAmount} and ${rule.maxAmount}`);
      return;
    }

    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + rule.durationMonths);
    
    const loan = {
      id: Date.now().toString(),
      memberId: memberRecord.id,
      memberName: memberRecord.fullname,
      principal,
      interestRate: settings.interestPercentage || 10,
      expectedReturn: principal + (principal * ((settings.interestPercentage || 10) / 100)),
      balance: principal + (principal * ((settings.interestPercentage || 10) / 100)),
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'PENDING',
      fundType: 'SHARE',
      timestamp: new Date().toISOString()
    };
    
    await addToSyncQueue('CREATE', 'loans', loan);
    toast.success('Loan requested successfully. Awaiting Secretary verification.');
    setIsLoanModalOpen(false);
    loadData();
    if (isOnline) performSync();
  };

  const handleSavePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberRecord) return;
    
    const pledgeData = {
      id: newPledge.id || Date.now().toString(),
      memberId: memberRecord.id,
      month: Number(newPledge.month),
      year: Number(newPledge.year),
      shareAmount: parseFloat(newPledge.shareAmount) || 0,
      loanRepaymentAmount: parseFloat(newPledge.loanRepaymentAmount) || 0,
      timestamp: new Date().toISOString()
    };
    
    await addToSyncQueue(newPledge.id ? 'UPDATE' : 'CREATE', 'pledges', pledgeData);
    toast.success('Pledge saved successfully.');
    setIsPledgeModalOpen(false);
    loadData();
    if (isOnline) performSync();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground font-medium italic">Welcome back, {user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl w-fit"><Wallet className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">My Total Shares</p>
            <h3 className="text-3xl font-bold text-emerald-500">{settings.currency} {memberShares.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="glass p-6 rounded-[2rem] flex flex-col gap-4">
          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl w-fit"><CreditCard className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">Active Loan Balance</p>
            <h3 className="text-3xl font-bold text-rose-500">{settings.currency} {activeLoan?.balance?.toLocaleString() || 0}</h3>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={() => {
          if (activeLoan) {
            toast.error('You already have an active loan. You cannot request another.');
            return;
          }
          setIsLoanModalOpen(true);
        }} className="flex-1 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
          <Banknote className="w-5 h-5" /> Request Loan
        </button>
        <button onClick={() => {
          setNewPledge({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), shareAmount: '', loanRepaymentAmount: '', id: '' });
          setIsPledgeModalOpen(true);
        }} className="flex-1 py-4 bg-secondary text-secondary-foreground font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95">
          <Calendar className="w-5 h-5" /> Make a Pledge
        </button>
      </div>

      <div className="glass p-8 rounded-[2.5rem] space-y-6">
        <h2 className="text-xl font-bold tracking-tight">My Pledges</h2>
        <div className="space-y-4">
          {myPledges.length === 0 ? (
             <p className="text-muted-foreground text-sm font-semibold">You have no active pledges.</p>
          ) : (
            myPledges.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-secondary/30 rounded-2xl border border-transparent hover:border-primary/20 transition-colors">
                <div>
                  <p className="font-bold text-lg">{p.month}/{p.year}</p>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">Shares: {settings.currency} {p.shareAmount} | Loan Repayment: {settings.currency} {p.loanRepaymentAmount}</p>
                </div>
                <button onClick={() => {
                  setNewPledge({ month: p.month, year: p.year, shareAmount: String(p.shareAmount), loanRepaymentAmount: String(p.loanRepaymentAmount), id: p.id });
                  setIsPledgeModalOpen(true);
                }} className="p-3 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"><Edit2 className="w-4 h-4" /></button>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {isLoanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsLoanModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6 tracking-tight">Request Loan</h2>
              <form onSubmit={handleRequestLoan} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Loan Rule</label>
                  <select required value={newLoan.ruleId} onChange={e => setNewLoan({...newLoan, ruleId: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold">
                    <option value="">Select Range</option>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {rules.map((r: any) => <option key={r.id} value={r.id}>{r.minAmount} - {r.maxAmount} ({r.durationMonths}m)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Principal ({settings.currency})</label>
                  <input required type="number" value={newLoan.principal} onChange={e => setNewLoan({...newLoan, principal: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsLoanModalOpen(false)} className="flex-1 py-4 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">Submit Request</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isPledgeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={() => setIsPledgeModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md bg-background rounded-[2.5rem] p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-6 tracking-tight">{newPledge.id ? 'Edit' : 'Make'} Pledge</h2>
              <form onSubmit={handleSavePledge} className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Month (1-12)</label>
                    <input required type="number" min="1" max="12" value={newPledge.month} onChange={e => setNewPledge({...newPledge, month: Number(e.target.value)})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Year</label>
                    <input required type="number" value={newPledge.year} onChange={e => setNewPledge({...newPledge, year: Number(e.target.value)})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Share Amount</label>
                  <input type="number" value={newPledge.shareAmount} onChange={e => setNewPledge({...newPledge, shareAmount: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-muted-foreground ml-1 uppercase">Loan Repayment Amount</label>
                  <input type="number" value={newPledge.loanRepaymentAmount} onChange={e => setNewPledge({...newPledge, loanRepaymentAmount: e.target.value})} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none font-bold" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsPledgeModalOpen(false)} className="flex-1 py-4 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 py-4 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">Save Pledge</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemberDashboard;
