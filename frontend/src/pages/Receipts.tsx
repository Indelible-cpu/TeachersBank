import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Receipt as ReceiptIcon, Printer, Share2 } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { getSetting, setSetting } from '../services/db';

interface ReceiptData {
  id: string;
  receiptNumber: string;
  memberName: string;
  memberPhone?: string;
  amount: number;
  type: string;
  timestamp: string;
}

const Receipts = () => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const cached = await getSetting('receipts');
      if (cached && isMounted) {
        setReceipts(cached);
      } else if (isMounted) {
        const initial: ReceiptData[] = [
          { id: '1', receiptNumber: 'TBTS-2026-0001', memberName: 'John Banda', memberPhone: '265991234567', amount: 50000, type: 'Monthly Share', timestamp: new Date().toISOString() },
          { id: '2', receiptNumber: 'TBTS-2026-0002', memberName: 'Mary Phiri', memberPhone: '265887654321', amount: 20000, type: 'Loan Repayment', timestamp: new Date().toISOString() }
        ];
        setReceipts(initial);
        await setSetting('receipts', initial);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = (receipt: ReceiptData) => {
    const phone = receipt.memberPhone ? receipt.memberPhone.replace(/[^0-9]/g, '') : '';
    const message = `*${settings.organizationName}*\n\nHello ${receipt.memberName},\n\nYour receipt has been generated successfully.\n\n*Receipt No:* ${receipt.receiptNumber}\n*Amount:* MWK ${receipt.amount.toLocaleString()}\n*Type:* ${receipt.type}\n*Date:* ${new Date(receipt.timestamp).toLocaleDateString()}\n\n${settings.receiptFooter}`;
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-1 print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">{t('receipts.title')}</h1>
        <p className="text-muted-foreground">View, print, and share transaction receipts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3 print:hidden max-h-[80vh] overflow-y-auto pr-2">
          {receipts.map((r, i) => (
            <motion.div 
              key={r.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedReceipt(r)}
              className={`glass p-4 rounded-xl cursor-pointer transition-colors ${selectedReceipt?.id === r.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/30'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-muted-foreground">{r.receiptNumber}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary">
                  {r.type}
                </span>
              </div>
              <h4 className="font-semibold">{r.memberName}</h4>
              <p className="text-lg font-bold mt-1">MWK {r.amount.toLocaleString()}</p>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedReceipt ? (
            <div className="glass p-8 rounded-2xl bg-white text-black dark:bg-white dark:text-black shadow-xl mx-auto max-w-lg print:shadow-none print:m-0 print:w-full">
              <div className="text-center pb-6 border-b-2 border-gray-200 border-dashed">
                <h2 className="text-2xl font-black uppercase tracking-widest">{settings.systemName}</h2>
                <p className="text-sm font-semibold text-gray-500 mt-1">{settings.organizationName}</p>
                <p className="text-xs text-gray-400 mt-1">Receipt: {selectedReceipt.receiptNumber}</p>
              </div>

              <div className="py-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium uppercase text-xs">{t('receipts.date')}</span>
                  <span className="font-bold">{new Date(selectedReceipt.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium uppercase text-xs">{t('receipts.member')}</span>
                  <span className="font-bold">{selectedReceipt.memberName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium uppercase text-xs">{t('receipts.type')}</span>
                  <span className="font-bold">{selectedReceipt.type}</span>
                </div>
                
                <div className="pt-4 border-t-2 border-gray-100 flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase text-sm">{t('receipts.amount')}</span>
                  <span className="font-black text-2xl">MWK {selectedReceipt.amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-8 text-center border-t-2 border-gray-200 border-dashed">
                <div className="w-48 mx-auto border-b border-black mb-2 h-8"></div>
                <p className="text-xs font-bold uppercase">{t('receipts.signature')}</p>
              </div>
              
              <div className="mt-8 text-center text-xs text-gray-400 italic">
                {settings.receiptFooter}
              </div>

              <div className="mt-8 pt-6 border-t flex gap-4 print:hidden">
                <button 
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  {t('receipts.print')}
                </button>
                <button 
                  onClick={() => handleWhatsAppShare(selectedReceipt)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-green-500/30"
                >
                  <Share2 className="w-5 h-5" />
                  WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="glass h-full rounded-2xl flex flex-col items-center justify-center text-muted-foreground p-12 print:hidden">
              <ReceiptIcon className="w-16 h-16 mb-4 opacity-50" />
              <p>Select a receipt from the list to view and share.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Receipts;
