import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Printer, Share2, Filter, User, Calendar } from 'lucide-react';
import { getSetting } from '../services/db';
import { useSettings } from '../context/useSettings';

const Reports = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  
  const [reportType, setReportType] = useState<'FULL' | 'INDIVIDUAL'>('FULL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState('');
  
  const [members, setMembers] = useState<Record<string, unknown>[]>([]);
  const [contributions, setContributions] = useState<Record<string, unknown>[]>([]);
  const [loans, setLoans] = useState<Record<string, unknown>[]>([]);
  const [repayments, setRepayments] = useState<Record<string, unknown>[]>([]);

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
        setMembers(cachedMembers as Record<string, unknown>[]);
        setContributions(cachedContribs as Record<string, unknown>[]);
        setLoans(cachedLoans as Record<string, unknown>[]);
        setRepayments(cachedRepayments as Record<string, unknown>[]);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const filteredContributions = contributions.filter(c => {
    if (selectedMonth !== 'ALL' && c.month !== selectedMonth) return false;
    if (reportType === 'INDIVIDUAL' && c.memberId !== selectedMember) return false;
    return true;
  });

  const filteredLoans = loans.filter(l => {
    if (reportType === 'INDIVIDUAL' && l.memberId !== selectedMember) return false;
    return true;
  });

  const filteredRepayments = repayments.filter(r => {
    if (reportType === 'INDIVIDUAL' && r.memberId !== selectedMember) return false;
    return true;
  });

  const totalShares = filteredContributions.filter(c => c.type === 'SHARE').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalEmergency = filteredContributions.filter(c => c.type === 'EMERGENCY').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const activeLoansTotal = filteredLoans.filter(l => l.status !== 'FULLY_PAID').reduce((sum, l) => sum + (Number(l.balance) || 0), 0);
  const totalRepaymentsAmount = filteredRepayments.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const reportText = `*${settings.systemName} - Financial Report*\nType: ${reportType === 'FULL' ? 'Full Report' : 'Individual Report'}\nMonth: ${selectedMonth}\n\n*Summary:*\nTotal Shares: MWK ${totalShares.toLocaleString()}\nTotal Emergency: MWK ${totalEmergency.toLocaleString()}\nActive Loans: MWK ${activeLoansTotal.toLocaleString()}\nTotal Repayments: MWK ${totalRepaymentsAmount.toLocaleString()}\n\nGenerated on: ${new Date().toLocaleDateString()}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Financial Report',
          text: reportText,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(reportText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const currentMember = members.find(m => m.id === selectedMember);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Controls - Hidden when printing */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
            <p className="text-muted-foreground">Generate, print, and share professional financial reports.</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 transition-all"
            >
              <Printer className="w-5 h-5" />
              <span className="hidden sm:inline">{t('reports.print')}</span>
            </button>
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">{t('reports.share')}</span>
            </button>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
              <Filter className="w-4 h-4" /> Report Type
            </label>
            <div className="flex bg-secondary/50 p-1 rounded-xl">
              <button
                onClick={() => setReportType('FULL')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${reportType === 'FULL' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t('reports.full_report')}
              </button>
              <button
                onClick={() => setReportType('INDIVIDUAL')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${reportType === 'INDIVIDUAL' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {t('reports.individual_report')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {t('reports.select_month')}
            </label>
            <select
              title="Select Month"
              aria-label="Select Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none font-medium"
            >
              {months.map(m => (
                <option key={m} value={m}>{m === 'ALL' ? t('reports.all_months') : m}</option>
              ))}
            </select>
          </div>

          {reportType === 'INDIVIDUAL' && (
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> {t('reports.select_member')}
              </label>
              <select
                title="Select Member"
                aria-label="Select Member"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="w-full px-4 py-2.5 bg-secondary/50 rounded-xl outline-none focus:ring-2 focus:ring-primary appearance-none font-medium"
              >
                <option value="">-- Select Member --</option>
                {members.map(m => (
                  <option key={String(m.id)} value={String(m.id)}>{String(m.fullname)} ({String(m.memberNumber)})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white text-black p-8 md:p-12 rounded-2xl shadow-xl print:shadow-none print:p-0 print:m-0"
        ref={reportRef}
        id="printable-report"
      >
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-report, #printable-report * {
                visibility: visible;
              }
              #printable-report {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .print\\:hidden {
                display: none !important;
              }
            }
          `}
        </style>

        {/* Report Header */}
        <div className="flex flex-col items-center justify-center text-center border-b-2 border-gray-200 pb-8 mb-8">
          {settings.logo && (
            <img src={settings.logo} alt="Logo" className="h-20 mb-4 object-contain" />
          )}
          <h1 className="text-3xl font-black uppercase text-gray-900 tracking-wider mb-2">
            {settings.organizationName}
          </h1>
          <h2 className="text-xl text-gray-600 font-medium mb-4">
            {reportType === 'FULL' ? t('reports.full_report') : t('reports.individual_report')}
          </h2>
          
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-gray-500 font-medium">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {t('reports.report_for')}: {selectedMonth === 'ALL' ? t('reports.all_months') : selectedMonth}
            </span>
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              {t('reports.date_generated')}: {new Date().toLocaleDateString()}
            </span>
            {reportType === 'INDIVIDUAL' && currentMember && (
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">
                Member: {String(currentMember.fullname)} ({String(currentMember.memberNumber)})
              </span>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2 border-b border-gray-200 pb-2">
            <FileText className="w-5 h-5" />
            Financial Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('reports.total_shares')}</p>
              <h4 className="text-2xl font-black text-gray-900">MWK {totalShares.toLocaleString()}</h4>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('reports.total_emergency')}</p>
              <h4 className="text-2xl font-black text-gray-900">MWK {totalEmergency.toLocaleString()}</h4>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('reports.active_loans')}</p>
              <h4 className="text-2xl font-black text-gray-900">MWK {activeLoansTotal.toLocaleString()}</h4>
            </div>
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('reports.total_repayments')}</p>
              <h4 className="text-2xl font-black text-gray-900">MWK {totalRepaymentsAmount.toLocaleString()}</h4>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown - Contributions */}
        {filteredContributions.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Contributions Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="p-3 font-semibold rounded-tl-lg">Date</th>
                    {reportType === 'FULL' && <th className="p-3 font-semibold">Member</th>}
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Month</th>
                    <th className="p-3 font-semibold text-right rounded-tr-lg">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredContributions.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-3 text-sm text-gray-600">{new Date(String(c.timestamp)).toLocaleDateString()}</td>
                      {reportType === 'FULL' && <td className="p-3 font-medium text-gray-900">{String(c.memberName)}</td>}
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-md ${c.type === 'SHARE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {String(c.type)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{String(c.month)} {String(c.year)}</td>
                      <td className="p-3 font-bold text-right text-gray-900">MWK {Number(c.amount).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Breakdown - Loans */}
        {filteredLoans.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Loans Overview</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                    <th className="p-3 font-semibold rounded-tl-lg">Date</th>
                    {reportType === 'FULL' && <th className="p-3 font-semibold">Member</th>}
                    <th className="p-3 font-semibold">Principal</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right rounded-tr-lg">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLoans.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-3 text-sm text-gray-600">{new Date(String(l.timestamp)).toLocaleDateString()}</td>
                      {reportType === 'FULL' && <td className="p-3 font-medium text-gray-900">{String(l.memberName)}</td>}
                      <td className="p-3 text-sm font-medium text-gray-900">MWK {Number(l.principal).toLocaleString()}</td>
                      <td className="p-3">
                         <span className="px-2 py-1 text-xs font-bold rounded-md bg-blue-100 text-blue-800">
                          {String(l.status)}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-right text-rose-600">MWK {Number(l.balance).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-col items-center">
          <p className="text-gray-500 text-sm font-medium mb-12">This is a system generated report and does not require a physical signature unless printed for official use.</p>
          
          <div className="flex justify-between w-full max-w-2xl px-8 mt-8">
            <div className="text-center">
              <div className="w-48 h-px bg-gray-400 mb-2"></div>
              <p className="text-sm font-bold text-gray-700">Prepared By</p>
              <p className="text-xs text-gray-500">System Administrator / Accountant</p>
            </div>
            <div className="text-center">
              <div className="w-48 h-px bg-gray-400 mb-2"></div>
              <p className="text-sm font-bold text-gray-700">Approved By</p>
              <p className="text-xs text-gray-500">Chairperson / Treasurer</p>
            </div>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default Reports;
