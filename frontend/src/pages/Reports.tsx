import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Printer, Share2, Filter, User, Calendar, ShieldCheck, ShieldAlert, MessageCircle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import api from '../services/api';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';
import { useToast } from '../context/useToast';
import { SignaturePad } from '../components/SignaturePad';

const Reports = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const toast = useToast();
  
  const [reportType, setReportType] = useState<'FULL' | 'INDIVIDUAL'>('FULL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('');
  const [showOnlyConfirmed, setShowOnlyConfirmed] = useState(true);
  const [secretarySignature, setSecretarySignature] = useState<string | null>(null);
  
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

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
      
      try {
        const res = await api.get('/users');
        if (isMounted) {
          setUsers(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch users in reports', err);
      }
      
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
  const accumulatedInterest = filteredLoans.reduce((sum, l) => sum + ((Number(l.expectedReturn) || 0) - (Number(l.principal) || 0)), 0);

  const currentMember = members.find(m => m.id === selectedMember);

  const secretaryUser = users.find(u => u.role === 'SECRETARY' && u.isActive) || users.find(u => u.role === 'SECRETARY');
  const secretaryName = secretaryUser ? secretaryUser.name : '';

  const treasurerUser = users.find(u => u.role === 'TREASURER' && u.isActive) || users.find(u => u.role === 'TREASURER');
  const treasurerName = treasurerUser ? treasurerUser.name : 'Not Designated';

  const generatePDFOptions = () => {
    let filename = `Report_${selectedMonth}_${new Date().getTime()}.pdf`;
    if (reportType === 'INDIVIDUAL' && currentMember) {
      const safeName = String(currentMember.fullname).replace(/[^a-zA-Z0-9_-]/g, '_');
      filename = `Report_${safeName}_${selectedMonth}_${new Date().getTime()}.pdf`;
    }
    return {
      margin: 10,
      filename,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };
  };

  const handlePrint = () => { window.print(); };

  const handleDownloadPDF = () => {
    if (!reportRef.current) return;
    html2pdf().set(generatePDFOptions()).from(reportRef.current).save();
  };

  const handleShare = async (platform?: 'whatsapp') => {
    if (!reportRef.current) return;
    
    try {
      const pdfOptions = generatePDFOptions();
      const pdfBlob = await html2pdf().set(pdfOptions).from(reportRef.current).output('blob');
      const file = new File([pdfBlob], pdfOptions.filename, { type: 'application/pdf' });
      
      let shareText = `Financial Report for ${selectedMonth}`;
      if (reportType === 'INDIVIDUAL' && currentMember) {
        shareText = `Individual Financial Report for ${currentMember.fullname} - Period: ${selectedMonth}`;
      }

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Financial Report',
          text: shareText
        });
      } else {
        // Fallback to download if Web Share API doesn't support files
        html2pdf().set(pdfOptions).from(reportRef.current).save();
        toast.info('File sharing not supported on this browser. Downloading PDF instead.');
      }
    } catch (error) {
      console.error('Error sharing PDF', error);
      toast.error('Could not share the document.');
    }
  };

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="print:hidden space-y-6 px-4 sm:px-8 pt-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight">{t('reports.title')}</h1>
            <p className="text-muted-foreground font-medium">Verified audit reports and financial statements.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
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
            <button onClick={() => handleShare()} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              <Share2 className="w-4 h-4" /> Share
            </button>

          </div>
        </div>

        <div className="glass p-6 rounded-[2.5rem] grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm border border-primary/5">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-foreground ml-1">Report Scope</label>
            <div className="flex bg-secondary p-1.5 rounded-[1.25rem]">
              <button onClick={() => setReportType('FULL')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${reportType === 'FULL' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'}`}>{t('reports.full_report')}</button>
              <button onClick={() => setReportType('INDIVIDUAL')} className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all ${reportType === 'INDIVIDUAL' ? 'bg-background shadow-md text-primary' : 'text-muted-foreground'}`}>{t('reports.individual_report')}</button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-foreground ml-1">Timeframe</label>
            <select title="Month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-4 py-3 bg-secondary text-foreground rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none">
              {months.map(m => <option key={m} value={m}>{m === 'ALL' ? 'Entire Cycle' : m}</option>)}
            </select>
          </div>

          {reportType === 'INDIVIDUAL' && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 text-foreground ml-1">Select Member</label>
              <select title="Member" value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)} className="w-full px-4 py-3 bg-secondary text-foreground rounded-2xl outline-none focus:ring-4 focus:ring-primary/10 font-bold appearance-none">
                <option value="">Choose Member</option>
                {members.map(m => <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white text-black px-2 py-6 sm:px-4 sm:py-8 md:px-6 w-full rounded-none print:p-0 print:m-0" ref={reportRef} id="printable-report">
        <style>{`@media print { body * { visibility: hidden; } #printable-report, #printable-report * { visibility: visible; } #printable-report { position: absolute; left: 0; top: 0; width: 100%; } .print\\:hidden { display: none !important; } }`}</style>

        <div className="flex flex-col items-center justify-center text-center border-b-4 border-black/20 pb-10 mb-10">
          <img src="/icon-192x192.png" alt="Logo" className="h-20 mb-6 object-contain" />
          <h1 className="text-4xl font-bold text-black tracking-tight mb-2 capitalize">{settings.organizationName || 'Teachers Bank'}</h1>
          
          <div className="flex flex-wrap justify-center gap-4 text-[10px] font-semibold capitalize tracking-widest text-black">
            <span>Period: {selectedMonth}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full my-auto"></span>
            <span>Generated: {new Date().toLocaleDateString()}</span>
            <span className="w-1.5 h-1.5 bg-gray-200 rounded-full my-auto"></span>
            <span>Status: {showOnlyConfirmed ? 'Verified' : 'Provisional'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6 mb-16">
          <div className="border-l-4 border-black pl-4">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Total shares</p>
            <h4 className="text-xl font-bold text-black">MWK {totalShares.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-black pl-4">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Emergency fund</p>
            <h4 className="text-xl font-bold text-black">MWK {totalEmergency.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-black pl-4">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Loan recovery</p>
            <h4 className="text-xl font-bold text-black">MWK {totalRepaymentsAmount.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-primary pl-4">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Interest</p>
            <h4 className="text-xl font-bold text-purple-600">MWK {accumulatedInterest.toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-emerald-500 pl-4 bg-emerald-50/50 p-2 rounded-r-lg">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Disbursement</p>
            <h4 className="text-xl font-black text-emerald-600">MWK {(totalShares + accumulatedInterest).toLocaleString()}</h4>
          </div>
          <div className="border-l-4 border-rose-500 pl-4">
            <p className="text-[10px] font-semibold text-black capitalize tracking-widest mb-1">Outstanding</p>
            <h4 className="text-xl font-bold text-rose-600">MWK {activeLoansTotal.toLocaleString()}</h4>
          </div>
        </div>

        {filteredContributions.length > 0 && (() => {
          const groupedContributions = Object.values(
            filteredContributions.reduce((acc, c) => {
              const key = `${c.memberId}-${c.year}-${c.month}`;
              if (!acc[key]) {
                acc[key] = {
                  date: new Date(c.timestamp),
                  memberName: c.memberName,
                  period: `${c.monthName} ${c.year}`,
                  shareAmount: 0,
                  emergencyAmount: 0,
                  totalAmount: 0
                };
              }
              if (c.type === 'SHARE') acc[key].shareAmount += c.amount;
              if (c.type === 'EMERGENCY') acc[key].emergencyAmount += c.amount;
              acc[key].totalAmount += c.amount;
              
              const cDate = new Date(c.timestamp);
              if (cDate > acc[key].date) acc[key].date = cDate;
              return acc;
            }, {} as Record<string, any>)
          ).sort((a: any, b: any) => b.date.getTime() - a.date.getTime());

          return (
            <div className="mb-16">
              <h3 className="text-sm font-black capitalize tracking-widest text-black mb-6 flex items-center gap-3">
                <span className="w-8 h-1 bg-black"></span> Contribution Detail
              </h3>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-black/20 text-[10px] font-black capitalize text-black">
                    <th className="py-4 pr-4">Date</th>
                    {reportType === 'FULL' && <th className="py-4">Member</th>}
                    <th className="py-4">Share</th>
                    <th className="py-4">Emergency</th>
                    <th className="py-4 text-right">Amount (MWK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groupedContributions.map((g: any, i) => (
                    <tr key={i} className="text-xs font-bold text-black">
                      <td className="py-4 text-black">{g.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                      {reportType === 'FULL' && <td className="py-4 text-black">{g.memberName}</td>}
                      <td className="py-4">
                        {g.shareAmount > 0 ? <span className="text-emerald-600">{g.shareAmount.toLocaleString()}</span> : <span className="text-gray-400">x</span>}
                      </td>
                      <td className="py-4">
                        {g.emergencyAmount > 0 ? <span className="text-rose-600">{g.emergencyAmount.toLocaleString()}</span> : <span className="text-gray-400">x</span>}
                      </td>
                      <td className="py-4 text-right font-black text-black">{g.totalAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}

        <div className="mt-20 pt-16 border-t border-black/20 flex flex-col items-center justify-center relative">
          <div className="space-y-4">
            <SignaturePad onSave={setSecretarySignature} label="Secretary Signature" />
            {!secretarySignature && (
              <div className="hidden print:block space-y-1">
                <div className="w-48 h-px bg-black/30"></div>
                <p className="text-[10px] font-bold text-black text-center">Secretary Signature</p>
              </div>
            )}
            {secretarySignature && (
               <p className="text-[10px] font-bold text-black print:block text-center uppercase tracking-widest">Secretary Signature</p>
            )}
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-black tracking-widest">Powered by Indelible Technologies</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
