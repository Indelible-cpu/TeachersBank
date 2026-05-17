import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useSettings } from '../context/useSettings';

const Terms = () => {
  const { settings } = useSettings();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      body: 'By accessing or using this system, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, you must not use this platform.',
    },
    {
      title: '2. System Access & Eligibility',
      body: 'Access to this system is restricted to authorized personnel of the cooperative organization. User accounts are assigned by the system administrator. Sharing account credentials is strictly prohibited.',
    },
    {
      title: '3. Roles & Responsibilities',
      body: 'Each user role (Admin, Treasurer, Secretary, Member) carries defined permissions and responsibilities. Users are expected to perform only the actions permitted by their assigned role. Unauthorized attempts to access restricted modules will be logged and reviewed.',
    },
    {
      title: '4. Dual-Control Workflow',
      body: 'All financial transactions recorded in the system operate under a dual-control workflow. Transactions initiated by a Secretary must be independently verified and confirmed by a Treasurer. Neither party may approve their own entries.',
    },
    {
      title: '5. Data Accuracy',
      body: 'All users are responsible for ensuring the accuracy of the data they input. Deliberate entry of false financial records is a serious breach of these Terms and may result in immediate account suspension and legal action.',
    },
    {
      title: '6. Audit Trail',
      body: 'All system actions are recorded in an immutable Audit Trail. This log includes the user identity, timestamp, action type, and outcome. This trail is accessible exclusively to the system administrator.',
    },
    {
      title: '7. Confidentiality',
      body: 'All financial data accessed through this system is strictly confidential. Users must not disclose, share, or reproduce any organizational or member financial information outside of authorized official channels.',
    },
    {
      title: '8. Termination',
      body: 'The system administrator reserves the right to suspend or terminate any user account found to be in violation of these Terms of Service, without prior notice.',
    },
    {
      title: '9. Amendments',
      body: 'These Terms of Service may be updated from time to time. Continued use of the system following any such changes constitutes your acceptance of the new terms.',
    },
    {
      title: '10. Contact',
      body: (
        <>
          For any questions regarding these Terms, contact the system support team at{' '}
          <a href="mailto:indelible.support@gmail.com" className="text-blue-500 hover:text-blue-600 hover:underline">
            indelible.support@gmail.com
          </a>
          , or via{' '}
          <a href="https://wa.me/265993732694" target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline font-bold">
            WhatsApp
          </a>{' '}
          and{' '}
          <a href="https://www.facebook.com/JEFInvestment" target="_blank" rel="noopener noreferrer" className="text-[#1877F2] hover:underline font-bold">
            Facebook
          </a>.
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/40 px-6 lg:px-16 min-h-[5rem] py-3 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <span className="text-lg font-black text-primary tracking-tight">{settings.systemName}</span>
      </header>

      <main className="flex-1 pt-28 pb-20 px-6 lg:px-16 max-w-4xl mx-auto w-full space-y-12">
        {/* Page title */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full text-xs font-bold text-primary">
            <FileText className="w-4 h-4" />
            Legal
          </div>
          <h1 className="text-5xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto">
            Please read these terms carefully before using the platform.
          </p>
          <p className="text-xs text-muted-foreground opacity-60 font-semibold">Last updated: 2026</p>
        </motion.div>

        {/* Terms sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass p-7 rounded-[1.75rem] border border-border/20 flex gap-5"
            >
              <div className="shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5 text-primary opacity-60" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-base tracking-tight">{section.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{section.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/10 py-6 px-6 text-center text-xs text-muted-foreground font-semibold opacity-60">
        © 2026 Indelible Technologies. All rights reserved.
      </footer>
    </div>
  );
};

export default Terms;
