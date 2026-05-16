import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Receipt as ReceiptIcon, Printer, Share2, X, Download } from 'lucide-react';
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
        <h1 className="text-3xl font-black tracking-tight">{t('receipts.title')}</h1>
        <p className="text-muted-foreground font-medium italic">Manage and issue official transaction receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {receipts.length === 0 && (
          <div className="col-span-full p-20 glass rounded-[2.5rem] text-center border-dashed border-2">
            <ReceiptIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground font-black uppercase tracking-widest opacity-40">No receipts in archive</p>
          </div>
        )}
        {receipts.map((r, i) => (
          <motion.div 
            key={r.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedReceipt(r)}
            className="glass p-5 rounded-[2rem] cursor-pointer transition-all hover:scale-[1.02] hover:border-primary/40 group border border-transparent shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-tighter">{r.receiptNumber}</span>
              <div className="p-2 bg-secondary rounded-xl group-hover:bg-primary transition-colors">
                <ReceiptIcon className="w-4 h-4 group-hover:text-primary-foreground" />
              </div>
            </div>
            <h4 className="font-black text-lg leading-tight truncate mb-1">{r.memberName}</h4>
            <div className="flex items-center justify-between mt-4">
              <p className="text-xl font-black">MWK {r.amount.toLocaleString()}</p>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                {r.type}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal View */}
      <AnimatePresence>
        {selectedReceipt && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md print:bg-white print:p-0 print:block"
            onClick={() => setSelectedReceipt(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden print:shadow-none print:rounded-none print:w-full print:max-w-none print:p-0"
              onClick={e => e.stopPropagation()}
            >
              <button 
                title="Close"
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-6 right-6 p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors print:hidden"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <div className="text-center pb-8 border-b-4 border-gray-100 border-double">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <img src="/icon-192x192.png" alt="Logo" className="w-14 h-14 object-contain grayscale" />
                </div>
                <h2 className="text-3xl font-black text-black uppercase tracking-tighter">{settings.systemName}</h2>
                <p className="text-sm font-black text-gray-400 mt-1 uppercase tracking-widest">{settings.organizationName}</p>
                <div className="mt-4 px-4 py-1 bg-gray-100 rounded-full inline-block">
                  <p className="text-[10px] font-black text-gray-600">OFFICIAL RECEIPT: {selectedReceipt.receiptNumber}</p>
                </div>
              </div>

              <div className="py-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Date / Time</span>
                    <p className="font-bold text-black mt-1">{new Date(selectedReceipt.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Transaction Type</span>
                    <p className="font-bold text-black mt-1">{selectedReceipt.type}</p>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-gray-50 border-2 border-gray-100 border-dashed">
                  <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Issued To</span>
                  <p className="text-2xl font-black text-black mt-1">{selectedReceipt.memberName}</p>
                  <p className="text-xs font-bold text-gray-500 mt-1">{selectedReceipt.memberPhone || 'No contact provided'}</p>
                </div>
                
                <div className="flex justify-between items-center px-2">
                  <span className="text-gray-500 font-black uppercase text-xs tracking-widest">Total Amount</span>
                  <span className="font-black text-4xl text-black">
                    <span className="text-lg font-bold mr-1 text-gray-400">MWK</span>
                    {selectedReceipt.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-10 text-center border-t-2 border-gray-100">
                <div className="w-40 h-1 bg-gray-900 mx-auto rounded-full mb-3 opacity-10"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('receipts.signature')}</p>
                <p className="mt-8 text-[10px] text-gray-400 font-medium px-10 italic leading-relaxed">
                  {settings.receiptFooter}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-3 gap-4 print:hidden">
                <button 
                  onClick={handlePrint}
                  className="flex flex-col items-center gap-2 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black rounded-3xl transition-all"
                >
                  <Printer className="w-5 h-5" />
                  <span className="text-[10px] uppercase">Print</span>
                </button>
                <button 
                  title="Download"
                  className="flex flex-col items-center gap-2 py-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-black rounded-3xl transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span className="text-[10px] uppercase">PDF</span>
                </button>
                <button 
                  onClick={() => handleWhatsAppShare(selectedReceipt)}
                  className="flex flex-col items-center gap-2 py-4 bg-green-500 hover:bg-green-600 text-white font-black rounded-3xl transition-all shadow-xl shadow-green-500/20"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-[10px] uppercase">WhatsApp</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Receipts;
