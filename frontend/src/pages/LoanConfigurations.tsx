import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Sliders } from 'lucide-react';
import { useSettings } from '../context/useSettings';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/useToast';

const LoanConfigurations = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const toast = useToast();
  
  const isAdmin = user?.role === 'ADMIN';

  const [loanRules, setLoanRules] = useState(settings.loanDurationRules || [
    { id: '1', minAmount: 1, maxAmount: 50000, durationMonths: 3 },
    { id: '2', minAmount: 50001, maxAmount: 100000, durationMonths: 6 },
    { id: '3', minAmount: 100001, maxAmount: 500000, durationMonths: 12 },
    { id: '4', minAmount: 500001, maxAmount: 9999999, durationMonths: 24 }
  ]);

  if (!isAdmin) {
    return <div className="p-8 text-center font-bold">Access Denied</div>;
  }

  const handleAddRule = async () => {
    const minVal = parseFloat((document.getElementById('new-rule-min') as HTMLInputElement)?.value) || 0;
    const maxVal = parseFloat((document.getElementById('new-rule-max') as HTMLInputElement)?.value) || 0;
    const durVal = parseInt((document.getElementById('new-rule-duration') as HTMLInputElement)?.value) || 0;
    
    if (minVal < 0 || maxVal <= minVal || durVal <= 0) {
      toast.error('Invalid range or duration. Please check amounts and month duration.');
      return;
    }

    const newRule = {
      id: Date.now().toString(),
      minAmount: minVal,
      maxAmount: maxVal,
      durationMonths: durVal
    };

    const updatedRules = [...loanRules, newRule];
    setLoanRules(updatedRules);
    
    try {
      await updateSettings({ ...settings, loanDurationRules: updatedRules });
      toast.success('Loan duration range added successfully');
      
      // Clear fields
      (document.getElementById('new-rule-min') as HTMLInputElement).value = '';
      (document.getElementById('new-rule-max') as HTMLInputElement).value = '';
      (document.getElementById('new-rule-duration') as HTMLInputElement).value = '';
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration');
    }
  };

  const handleRemoveRule = async (ruleId: string) => {
    const updatedRules = loanRules.filter(r => r.id !== ruleId);
    setLoanRules(updatedRules);
    
    try {
      await updateSettings({ ...settings, loanDurationRules: updatedRules });
      toast.success('Loan range removed successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save configuration');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sliders className="w-8 h-8 text-primary" />
          Loan Configurations
        </h1>
        <p className="text-muted-foreground font-medium italic">Configure range-based term limits and monthly durations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rules Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 md:p-8 shadow-sm lg:col-span-2 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <h2 className="text-xl font-semibold">Active Term & Range Rules</h2>
            <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
              {loanRules.length} Active Rules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30">
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Min Amount ({settings.currency})</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Max Amount ({settings.currency})</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Duration (Months)</th>
                  <th className="px-4 py-3 text-[10px] font-semibold capitalize tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loanRules.map((rule, idx) => (
                  <tr key={rule.id || idx} className="border-b border-border/20 hover:bg-secondary/10">
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.minAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.maxAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">
                      {rule.durationMonths} Months
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleRemoveRule(rule.id)}
                        className="text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors border border-destructive/20"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
                {loanRules.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-muted-foreground italic font-semibold">
                      No range-based term rules currently defined.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Add Range Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 md:p-8 shadow-sm flex flex-col gap-6"
        >
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <Sliders className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Add New Range</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1" htmlFor="new-rule-min">Min Amount ({settings.currency})</label>
              <input
                id="new-rule-min"
                type="number"
                placeholder="e.g. 1"
                className="w-full px-4 py-3 bg-secondary/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1" htmlFor="new-rule-max">Max Amount ({settings.currency})</label>
              <input
                id="new-rule-max"
                type="number"
                placeholder="e.g. 50000"
                className="w-full px-4 py-3 bg-secondary/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground ml-1" htmlFor="new-rule-duration">Duration (Months)</label>
              <input
                id="new-rule-duration"
                type="number"
                placeholder="e.g. 3"
                className="w-full px-4 py-3 bg-secondary/50 border border-border/50 rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddRule}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
          >
            <Save className="w-5 h-5" />
            Add Range Rule
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default LoanConfigurations;
