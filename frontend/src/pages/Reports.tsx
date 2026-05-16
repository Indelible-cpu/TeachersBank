import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Printer, Share2, Filter, User, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';

const Reports = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  const [reportType, setReportType] = useState<'FULL' | 'INDIVIDUAL'>('FULL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('');
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(true);
  
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<any[]>([]);

  const reportRef = useRef<HTMLDivElement>(null);

  const months = [
    'ALL', 'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cachedMembers = await getSetting('members') || [];
      const cachedContribs = await getSetting('contributions') || [];
      const cachedLoans = await getSetting('loans') || [];
      const cachedRepayments = await getSetting('repayments') || [];
      
      if (isMounted) {
        setMembers(cachedMembers);
        setContributions(cachedContribs);
        setLoans(cachedLoans);
        setRepayments(cachedRepayments);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const filteredContributions = contributions.filter(c => {
    if (showOnlyConfirmed && c.status !== 'CONFIRMED') return false;
    if (selectedMonth !== 'ALL' && c.monthName !== selectedMonth) return false;
    if (reportType === 'INDIVIDUAL' && c.memberId !== selectedMember) return false;
    return true;
  });

  const filteredLoans = loans.filter(l => {
    if (reportType === 'INDIVIDUAL' && l.memberId !== selectedMember) return false;
    return true;
  });

  const filteredRepayments = repayments.filter(r => {
    if (showOnlyConfirmed && r.status !== 'CONFIRMED') return false;
    if (reportType === 'INDIVIDUAL' && r.memberId !== selectedMember) return false;
    return true;
  });

  const totalShares = filteredContributions.filter(c => c.type === 'SHARE').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalEmergency = filteredContributions.filter(c => c.type === 'EMERGENCY').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const activeLoansTotal = filteredLoans.filter(l => l.status !== 'FULLY_PAID').reduce((sum, l) => sum + (Number(l.balance) || 0), 0);
  const totalRepaymentsAmount = filteredRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handlePrint = () => { window.print(); };

  const handleShare = async () => {
    const reportText = `*${settings.systemName} - Financial Report*\nStatus: ${showOnlyConfirmed ? 'VERIFIED ONLY' : 'ALL ENTRIES'}\nSummary: MWK ${(totalShares + totalEmergency).toLocaleString()}`;
    if (navigator.share) {
      await navigator.share({ title: 'Financial Report', text: reportText });
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(reportText)}`, '_blank');
    }
  };

  const currentMember = members.find(m => m.id === selectedMember);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight">{t('reports.title')}</h1>
            <p className="text-muted-foreground font-medium">Verified audit reports and financial statements.</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setShowOnlyConfirmed(!showOnlyConfirmed)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all border ${showOnlyConfirmed ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}
            >
              {showOnlyConfirmed ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
              {showOnlyConfirmed ? 'Verified Only' : 'Include Pending'}
            </button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all border border-transparent">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              <Share2 className="w-4 h-4" /> Share
            </button>
          </div>
        </div>

        <div className="glass p-6 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm border border-primary/5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground ml-1">Report Scope</label>
            <div className="flex bg-secondary/50 p-1.5 rounded-[1.25rem]">
              <button onClick={() => setReportType('FULL')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${reportType === 'FULL' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'}`}>{t('reports.full_report')}</button>
              <button onClick={() => setReportType('INDIVIDUAL')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${reportType === 'INDIVIDUAL' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'}`}>{t('reports.individual_report')}</button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground ml-1">Timeframe</label>
            <select title="Month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none">
              {months.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Entire Cycle' : m}</option>)}
            </select>
          </div>

          {reportType === 'INDIVIDUAL' && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-muted-foreground ml-1">Select Member</label>
              <select title="Member" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full px-4 py-3 bg-secondary/50 rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none">
                <option value="">Choose Member</option>
                {members.map(m => <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-black p-10 md:p-16 rounded-[3rem] shadow-2xl print:shadow-none print:p-0 print:m-0" ref={reportRef} id="printable-report">
        <style>{`@media print { body * { visibility: hidden; } #printable-report, #printable-report * { visibility: visible; } #printable-report { position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } }`}</style>

        <div className="flex flex-col items-center justify-center text-center border-b-4 border-gray-100 pb-10 mb-10">
          <img src="/icon-192x192.png" alt="Logo" className="h-20 mb-6 grayscale" />
          <h1 className="text-4xl font-black uppercase text-gray-900 tracking-tighter mb-2">{settings.organizationName}</h1>
          <div className="px-6 py-1.5 bg-gray-900 text-white rounded-full text-xs font-black uppercase tracking-[0.2em] mb-6">{reportType === 'FULL' ? 'General Financial Statement' : 'Member Activity Statement'}</div>
          
          <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>Period: {selectedMonth}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full my-auto"></span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full my-auto"></span>
            <span>Status: {showOnlyConfirmed ? 'VERIFIED' : 'PROVISIONAL'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="border-l-4 border-gray-900 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Shares</p>
            <h4 className="text-2xl font-black text-gray-900">MWK {totalShares.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-gray-900 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Emergency Fund</p>
            <h4 className="text-2xl font-black text-gray-900">MWK {totalEmergency.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-gray-900 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Loan Recovery</p>
            <h4 className="text-2xl font-black text-gray-900">MWK {totalRepaymentsAmount.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-gray-900 pl-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Outstanding Loans</p>
            <h4 className="text-2xl font-black text-rose-600">MWK {activeLoansTotal.toLocaleString()}</h4>
          </div>
        </div>

        {filteredContributions.length > 0 && (
          <div className="mb-16">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-gray-900"></span> Contribution Detail
            </h3>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900 text-[10px] font-black uppercase text-gray-400">
                  <th className="py-4 pr-4">Date</th>
                  {reportType === 'FULL' && <th className="py-4">Member</th>}
                  <th className="py-4">Type</th>
                  <th className="py-4">Period</th>
                  <th className="py-4 text-right">Amount (MWK)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContributions.map((c, i) => (
                  <tr key={i} className="text-xs font-bold">
                    <td className="py-4 text-gray-400">{new Date(c.timestamp).toLocaleDateString()}</td>
                    {reportType === 'FULL' && <td className="py-4">{c.memberName}</td>}
                    <td className="py-4 uppercase tracking-tighter text-[10px]">{c.type}</td>
                    <td className="py-4 text-gray-400">{c.monthName} {c.year}</td>
                    <td className="py-4 text-right font-black">{c.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-20 pt-16 border-t-2 border-gray-100 flex justify-between items-end">
          <div className="space-y-8">
            <div className="space-y-1">
              <div className="w-48 h-0.5 bg-gray-900"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Secretary Signature</p>
            </div>
            <div className="space-y-1">
              <div className="w-48 h-0.5 bg-gray-900"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Treasurer Signature</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-gray-300 mb-2">System Authenticated</p>
            <div className="flex items-center gap-2 justify-end text-gray-900">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-black text-lg tracking-tighter">{settings.systemName} SECURE</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
