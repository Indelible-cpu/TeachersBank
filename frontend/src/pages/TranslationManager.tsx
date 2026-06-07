import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Languages, Download, Upload, Save, AlertCircle, CheckCircle2, Search, Plus } from 'lucide-react';
import { getSetting, setSetting, addToSyncQueue } from '../services/db';
import { useToast } from '../context/ToastContext';

interface TranslationEntry {
  key: string;
  en: string;
  ny: string | null;
}

const TranslationManager = () => {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [missingKeys, setMissingKeys] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editEn, setEditEn] = useState('');
  const [editNy, setEditNy] = useState('');

  const loadTranslations = async () => {
    // Combine base JSON with dynamic DB translations
    const baseEn = i18n.getResourceBundle('en', 'translation') || {};
    const baseNy = i18n.getResourceBundle('ny', 'translation') || {};
    
    const dbTranslations = (await getSetting('translations') || []) as TranslationEntry[];
    const missing = (await getSetting('missing_translations') || []) as string[];
    
    const combinedMap = new Map<string, TranslationEntry>();
    
    // Load from base JSON
    const flattenObject = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(k => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          flattenObject(obj[k], pre + k);
        } else {
          combinedMap.set(pre + k, { key: pre + k, en: obj[k], ny: '' });
        }
      });
    };
    
    flattenObject(baseEn);
    
    // Apply NY base
    const flattenNy = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(k => {
        const pre = prefix.length ? prefix + '.' : '';
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          flattenNy(obj[k], pre + k);
        } else {
          if (combinedMap.has(pre + k)) {
            combinedMap.get(pre + k)!.ny = obj[k];
          } else {
            combinedMap.set(pre + k, { key: pre + k, en: '', ny: obj[k] });
          }
        }
      });
    };
    flattenNy(baseNy);

    // Apply DB Overrides
    dbTranslations.forEach(dbT => {
      if (combinedMap.has(dbT.key)) {
        const existing = combinedMap.get(dbT.key)!;
        existing.en = dbT.en || existing.en;
        existing.ny = dbT.ny || existing.ny;
      } else {
        combinedMap.set(dbT.key, { key: dbT.key, en: dbT.en, ny: dbT.ny });
      }
    });

    // Add Missing keys that haven't been resolved
    missing.forEach(mKey => {
      if (!combinedMap.has(mKey)) {
        combinedMap.set(mKey, { key: mKey, en: mKey, ny: '' });
      }
    });

    setTranslations(Array.from(combinedMap.values()));
    setMissingKeys(missing.filter(m => !combinedMap.get(m)?.ny));
  };

  useEffect(() => {
    loadTranslations();
  }, [i18n.language]);

  const handleSave = async (key: string, enValue: string, nyValue: string) => {
    const newEntry = { key, en: enValue, ny: nyValue };
    
    // Update local state
    setTranslations(prev => prev.map(t => t.key === key ? newEntry : t));
    
    // Save to IndexedDB and Queue for Sync
    const currentDb = (await getSetting('translations') || []) as TranslationEntry[];
    const existingIdx = currentDb.findIndex(d => d.key === key);
    
    if (existingIdx >= 0) {
      currentDb[existingIdx] = newEntry;
      await addToSyncQueue('UPDATE', 'translations', newEntry);
    } else {
      currentDb.push(newEntry);
      await addToSyncQueue('CREATE', 'translations', newEntry);
    }
    
    await setSetting('translations', currentDb);
    
    // Update i18next runtime
    i18n.addResourceBundle('en', 'translation', { [key]: enValue }, true, true);
    if (nyValue) {
      i18n.addResourceBundle('ny', 'translation', { [key]: nyValue }, true, true);
    }
    
    // Remove from missing if translated
    if (nyValue) {
      const missing = await getSetting('missing_translations') || [];
      const updatedMissing = missing.filter((m: string) => m !== key);
      await setSetting('missing_translations', updatedMissing);
      setMissingKeys(updatedMissing);
    }
    
    setEditingKey(null);
    showToast(t('dynamic_messages.translation_saved', 'Translation saved successfully'), 'success');
  };

  const exportJson = () => {
    const exportData = {
      en: translations.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.en }), {}),
      ny: translations.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.ny }), {})
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.en || !json.ny) {
          throw new Error("Invalid format. Expected { en: {}, ny: {} }");
        }
        
        let importedCount = 0;
        
        for (const [key, value] of Object.entries(json.en)) {
          const enStr = value as string;
          const nyStr = (json.ny as any)[key] as string;
          
          if (nyStr) {
             const entry = { key, en: enStr, ny: nyStr };
             await addToSyncQueue('CREATE', 'translations', entry);
             importedCount++;
          }
        }
        
        showToast(`Successfully queued ${importedCount} translations for import. Syncing...`, 'success');
        setTimeout(loadTranslations, 1000); // Reload after brief wait
      } catch (err) {
        showToast('Failed to parse JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const filtered = translations.filter(t => 
    t.key.toLowerCase().includes(search.toLowerCase()) || 
    t.en.toLowerCase().includes(search.toLowerCase()) ||
    (t.ny && t.ny.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: translations.length,
    enCount: translations.filter(t => t.en).length,
    nyCount: translations.filter(t => t.ny && t.ny.trim() !== '').length,
    missing: missingKeys.length
  };
  const coverage = stats.total > 0 ? Math.round((stats.nyCount / stats.total) * 100) : 0;

  return (
    <div className="w-full max-w-none px-4 lg:px-8 pt-4 pb-8 lg:pt-8 lg:pb-12 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Languages className="w-8 h-8 text-primary" />
            {t('translations.title', 'Translation Management')}
          </h1>
          <p className="text-muted-foreground mt-1">Manage English and Nyanja dictionaries across the system.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={exportJson} className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold">
            <Download className="w-4 h-4" /> Export
          </button>
          <label className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer">
            <Upload className="w-4 h-4" /> Import
            <input type="file" accept=".json" className="hidden" onChange={importJson} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-blue-500">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Total Keys</p>
          <h2 className="text-3xl font-black mt-2">{stats.total}</h2>
        </div>
        <div className="glass p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-emerald-500">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Nyanja Keys</p>
          <h2 className="text-3xl font-black mt-2 text-emerald-600">{stats.nyCount}</h2>
        </div>
        <div className="glass p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-orange-500">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Missing Translations</p>
          <h2 className="text-3xl font-black mt-2 text-orange-600 flex items-center gap-2">
            {stats.missing}
            {stats.missing > 0 && <AlertCircle className="w-5 h-5 text-orange-500" />}
          </h2>
        </div>
        <div className="glass p-6 rounded-2xl flex flex-col justify-center border-l-4 border-l-primary">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Coverage</p>
          <h2 className="text-3xl font-black mt-2 text-primary">{coverage}%</h2>
          <div className="w-full bg-secondary rounded-full h-2 mt-3">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: \`\${coverage}%\` }}></div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b bg-secondary/20 flex justify-between items-center">
          <div className="relative w-full max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search translation keys or text..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border-2 focus:border-primary/50 focus:ring-0 bg-background transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-secondary/40 sticky top-0 z-10 backdrop-blur-md">
              <tr className="text-xs uppercase tracking-widest text-muted-foreground">
                <th className="p-4 font-black">Translation Key</th>
                <th className="p-4 font-black w-1/3">English (Base)</th>
                <th className="p-4 font-black w-1/3">Nyanja (Chichewa)</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((tItem) => (
                <tr key={tItem.key} className={\`hover:bg-secondary/10 transition-colors \${!tItem.ny ? 'bg-orange-500/5' : ''}\`}>
                  <td className="p-4">
                    <span className="font-mono text-xs bg-secondary px-2 py-1 rounded-md text-foreground/80">{tItem.key}</span>
                  </td>
                  
                  {editingKey === tItem.key ? (
                    <>
                      <td className="p-4">
                        <textarea 
                          value={editEn} 
                          onChange={e => setEditEn(e.target.value)} 
                          className="w-full bg-background border-2 rounded-lg p-2 text-sm focus:border-primary resize-none"
                          rows={2}
                        />
                      </td>
                      <td className="p-4">
                        <textarea 
                          value={editNy} 
                          onChange={e => setEditNy(e.target.value)} 
                          className="w-full bg-background border-2 rounded-lg p-2 text-sm focus:border-primary resize-none"
                          rows={2}
                          placeholder="Translate to Nyanja..."
                        />
                      </td>
                      <td className="p-4 text-right align-top">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingKey(null)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs">Cancel</button>
                          <button onClick={() => handleSave(tItem.key, editEn, editNy)} className="btn-primary flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs">
                            <Save className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 text-sm font-medium">{tItem.en}</td>
                      <td className="p-4 text-sm font-medium">
                        {tItem.ny ? (
                          tItem.ny
                        ) : (
                          <span className="text-orange-500 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Missing Translation
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => {
                            setEditingKey(tItem.key);
                            setEditEn(tItem.en);
                            setEditNy(tItem.ny || '');
                          }}
                          className="text-primary font-bold text-xs uppercase tracking-wider hover:underline px-2 py-1"
                        >
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
             <div className="h-40 flex flex-col items-center justify-center opacity-50">
               <Languages className="w-12 h-12 mb-3 text-muted-foreground" />
               <p className="text-sm font-bold tracking-widest uppercase">No keys found.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationManager;
