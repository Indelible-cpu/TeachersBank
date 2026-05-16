import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { syncApi } from './api';

interface TBTSDB extends DBSchema {
  settings: {
    key: string;
    value: any;
  };
  users: {
    key: string;
    value: any;
  };
  members: {
    key: string;
    value: any[];
  };
  contributions: {
    key: string;
    value: any[];
  };
  loans: {
    key: string;
    value: any[];
  };
  repayments: {
    key: string;
    value: any[];
  };
  receipts: {
    key: string;
    value: any[];
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      action: 'CREATE' | 'UPDATE' | 'DELETE';
      entity: string;
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<TBTSDB>>;

export const initDB = () => {
  dbPromise = openDB<TBTSDB>('tbts-database', 1, {
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

export const getSetting = async (key: string) => {
  const db = await dbPromise;
  return db.get('settings', key);
};

export const setSetting = async (key: string, value: any) => {
  const db = await dbPromise;
  return db.put('settings', value, key);
};

export const addToSyncQueue = async (action: 'CREATE' | 'UPDATE' | 'DELETE', entity: string, data: any) => {
  const db = await dbPromise;
  await db.add('sync_queue', {
    action,
    entity,
    data,
    timestamp: Date.now(),
  });
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
  try {
    const queue = await getSyncQueue();
    if (queue.length === 0) return true;

    const response = await syncApi.sync(queue);
    
    if (response.data && response.data.serverState) {
      const db = await dbPromise;
      const { serverState } = response.data;
      
      // Update local cache with server truth
      if (serverState.members) await db.put('members', serverState.members, 'members_list');
      if (serverState.loans) await db.put('loans', serverState.loans, 'loans_list');
      if (serverState.repayments) await db.put('repayments', serverState.repayments, 'repayments_list');
      if (serverState.receipts) await db.put('receipts', serverState.receipts, 'receipts_list');
      if (serverState.settings) await db.put('settings', serverState.settings, 'global_settings');
      
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
