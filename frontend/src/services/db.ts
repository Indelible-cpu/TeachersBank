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
  dbPromise = openDB<TEBAMSDB>('tebams-database', 1, {
    upgrade(db) {
      db.createObjectStore('settings');
      db.createObjectStore('users', { keyPath: 'id' });
      db.createObjectStore('members');
      db.createObjectStore('contributions');
      db.createObjectStore('loans');
      db.createObjectStore('repayments');
      db.createObjectStore('receipts');
      
      const syncQueue = db.createObjectStore('sync_queue', {
        keyPath: 'id',
        autoIncrement: true,
      });
      syncQueue.createIndex('by-timestamp', 'timestamp');
    },
  });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSetting = async (key: string): Promise<any> => {
  const db = await dbPromise;
  return db.get('settings', key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const setSetting = async (key: string, value: any) => {
  const db = await dbPromise;
  return db.put('settings', value, key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const addToSyncQueue = async (action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) => {
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
  const db = await dbPromise;
  return db.getAllFromIndex('sync_queue', 'by-timestamp');
};

export const clearSyncQueue = async () => {
  const db = await dbPromise;
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
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
      action: item.action,
      table: item.entity || item.table,
      data: item.data
    }));

    const response = await syncApi.sync(mappedQueue);
    
    if (response.data && response.data.serverState) {
      const { serverState } = response.data;
      
      // Update local active cache with server truth in the 'settings' store
      if (serverState.members) await setSetting('members', serverState.members);
      if (serverState.loans) await setSetting('loans', serverState.loans);
      if (serverState.repayments) await setSetting('repayments', serverState.repayments);
      if (serverState.contributions) await setSetting('contributions', serverState.contributions);
      if (serverState.receipts) await setSetting('receipts', serverState.receipts);
      if (serverState.settings) {
        const currentLocal = await getSetting('global_settings') || {};
        await setSetting('global_settings', {
          ...currentLocal,
          ...serverState.settings
        });
      }
      if (serverState.staffCount !== undefined) await setSetting('staffCount', serverState.staffCount);
      
      // Clear queue on success
      await clearSyncQueue();
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
  const db = await dbPromise;
  const record = await db.get('users', email.toLowerCase());
  if (!record) return null;
  const hash = await hashPassword(email.toLowerCase() + ':' + passwordPlain);
  if (record.hash === hash) {
    return { user: record.user, token: record.token };
  }
  return null;
};
