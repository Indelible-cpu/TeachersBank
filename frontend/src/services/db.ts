import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { syncApi } from './api';

interface TEBAMSDB extends DBSchema {
  settings: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
  };
  users: {
    key: string;
    value: {
      id: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: any;
      token: string;
      hash: string;
    };
  };
  members: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  contributions: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  shareContributions: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  emergencyContributions: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  loans: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  repayments: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  receipts: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  translations: {
    key: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any[];
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      entity: string;
      table?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<TEBAMSDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<TEBAMSDB>('tebams-database', 1, {
    upgrade(db) {
      db.createObjectStore('settings');
      db.createObjectStore('users', { keyPath: 'id' });
      db.createObjectStore('members');
      db.createObjectStore('contributions');
      db.createObjectStore('shareContributions');
      db.createObjectStore('emergencyContributions');
      db.createObjectStore('loans');
      db.createObjectStore('repayments');
      db.createObjectStore('receipts');
      db.createObjectStore('translations');
      
      const syncQueue = db.createObjectStore('sync_queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncQueue.createIndex('by-timestamp', 'timestamp');
    },
  });
  }
  return dbPromise;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSetting = async (key: string): Promise<any> => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  return db.get('settings', key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setSetting = async (key: string, value: any) => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  return db.put('settings', value, key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addToSyncQueue = async (action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  await db.add('sync_queue', {
    action,
    entity,
    data,
    timestamp: Date.now(),
  });
  
  if (navigator.onLine) {
    // Fire-and-forget sync trigger in the background
    performSync().catch(err => console.error('Background sync failed:', err));
  }
};

export const getSyncQueue = async () => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  return db.getAllFromIndex('sync_queue', 'by-timestamp');
};

export const clearSyncQueue = async () => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
};

// Apply server state to local IndexedDB — the single source of reconciliation truth
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const applyServerState = async (serverState: any) => {
  if (serverState.members) {
    await setSetting('members', serverState.members);
    for (const member of serverState.members) {
      if (member.userId && member.photo) {
        await setSetting(`profile_photo_${member.userId}`, member.photo);
      }
    }
  }
  if (serverState.loans) await setSetting('loans', serverState.loans);
  if (serverState.repayments) await setSetting('repayments', serverState.repayments);
  if (serverState.contributions) await setSetting('contributions', serverState.contributions);
  if (serverState.shareContributions) await setSetting('shareContributions', serverState.shareContributions);
  if (serverState.emergencyContributions) await setSetting('emergencyContributions', serverState.emergencyContributions);
  if (serverState.receipts) await setSetting('receipts', serverState.receipts);
  if (serverState.translations) await setSetting('translations', serverState.translations);
  if (serverState.settings) {
    const currentLocal = await getSetting('global_settings') || {};
    await setSetting('global_settings', { ...currentLocal, ...serverState.settings });
  }
  if (serverState.staffCount !== undefined) await setSetting('staffCount', serverState.staffCount);

  // Reconstruct unified contributions cache from share and emergency records
  if (serverState.shareContributions || serverState.emergencyContributions) {
    const shares = serverState.shareContributions || await getSetting('shareContributions') || [];
    const emergencies = serverState.emergencyContributions || await getSetting('emergencyContributions') || [];
    const members = serverState.members || await getSetting('members') || [];
    
    const memberMap = new Map(members.map((m: any) => [m.id, m.fullname]));
    const MONTHS = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const combinedShares = shares.map((s: any) => ({
      ...s,
      type: 'SHARE',
      memberName: memberMap.get(s.memberId) || s.contributorName || 'Unknown',
      monthName: MONTHS[s.month - 1] || '',
      timestamp: s.createdAt || s.timestamp || new Date().toISOString()
    }));
    
    const combinedEmergencies = emergencies.map((e: any) => ({
      ...e,
      type: 'EMERGENCY',
      memberName: memberMap.get(e.memberId) || e.contributorName || 'Unknown',
      monthName: MONTHS[e.month - 1] || '',
      timestamp: e.createdAt || e.timestamp || new Date().toISOString()
    }));
    
    const combined = [...combinedShares, ...combinedEmergencies].sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    await setSetting('contributions', combined);
  }

  // Re-apply any pending offline items so they aren't wiped from the UI while they wait to be successfully synced
  const queue = await getSyncQueue();
  if (queue && queue.length > 0) {
    for (const item of queue) {
      if (item.action === 'CREATE' || item.action === 'UPDATE') {
        const table = item.entity || item.table;
        if (table) {
          const currentItems = await getSetting(table) || [];
          const idx = currentItems.findIndex((x: any) => x.id === item.data.id);
          if (idx >= 0) {
            currentItems[idx] = { ...currentItems[idx], ...item.data };
          } else if (item.action === 'CREATE') {
            currentItems.push(item.data);
          }
          await setSetting(table, currentItems);
        }
      } else if (item.action === 'DELETE') {
        const table = item.entity || item.table;
        if (table) {
          const currentItems = await getSetting(table) || [];
          await setSetting(table, currentItems.filter((x: any) => x.id !== item.data.id));
        }
      }
    }
  }

  // Dispatch a custom event to notify components that local DB has been updated
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sync-completed'));
  }
};

/**
 * Called on every login — sends an EMPTY queue to the server.
 * The server always replies with the full serverState, so the device
 * immediately gets the latest truth from Supabase, even if it has
 * nothing to push. This is the key cross-device sync mechanism.
 */
export const pullFromServer = async (): Promise<boolean> => {
  const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  if (!token || !navigator.onLine) return false;
  try {
    const response = await syncApi.sync([]);  // Empty queue = pure pull
    if (response.data?.serverState) {
      await applyServerState(response.data.serverState);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('Sync failed:', error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sync-error', { detail: error?.message || 'Sync failed' }));
    }
    return false;
  }
};

export const performSync = async () => {
  // Only sync if the user is authenticated (prevents 401 console errors on initial load)
  const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  if (!token) {
    return false;
  }

  try {
    const queue = await getSyncQueue();

    // Map 'entity' field to 'table' to match backend sync schema expectations
    const mappedQueue = queue.map((item) => ({
      queueId: item.id,
      action: item.action,
      table: item.entity || item.table,
      data: item.data
    }));

    const response = await syncApi.sync(mappedQueue);
    
    if (response.data && response.data.serverState) {
      const syncResults = response.data.syncResults;
      
      if (syncResults && syncResults.failed > 0 && syncResults.errors) {
        // Collect IDs of failed queue items
        const failedQueueIds = syncResults.errors.map((e: any) => e.item?.queueId).filter(Boolean);
        
        // Remove only successful items from the queue
        if (!dbPromise) initDB();
        const db = await dbPromise;
        const tx = db.transaction('sync_queue', 'readwrite');
        const allInQueue = await tx.store.getAll();
        for (const qItem of allInQueue) {
          if (!failedQueueIds.includes(qItem.id)) {
            await tx.store.delete(qItem.id!);
          }
        }
        await tx.done;
      } else {
        // Clear queue on success if no errors
        await clearSyncQueue();
      }

      await applyServerState(response.data.serverState);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Sync failed:', error);
    return false;
  }
};

async function hashPassword(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const cacheOfflineCredentials = async (email: string, passwordPlain: string, user: any, token: string) => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  const hash = await hashPassword(email.toLowerCase() + ':' + passwordPlain);
  await db.put('users', {
    id: email.toLowerCase(),
    user,
    token,
    hash
  });
};

export const verifyOfflineCredentials = async (email: string, passwordPlain: string) => {
  if (!dbPromise) initDB();
  const db = await dbPromise;
  const record = await db.get('users', email.toLowerCase());
  if (!record) return null;
  const hash = await hashPassword(email.toLowerCase() + ':' + passwordPlain);
  if (record.hash === hash) {
    return { user: record.user, token: record.token };
  }
  return null;
};
