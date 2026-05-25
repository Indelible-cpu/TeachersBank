import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This requires process.env.FIREBASE_SERVICE_ACCOUNT to be set with the base64-encoded JSON key,
// or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
export const initFirebaseAdmin = () => {
  if (admin.apps.length > 0) return;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`
      });
      console.log('Firebase Admin initialized successfully via base64 JSON');
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines with actual newlines
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      console.log('Firebase Admin initialized successfully via env vars');
    } else {
      console.warn('Firebase Admin is not configured. Realtime broadcasts will be skipped.');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
};

export const broadcastUpdate = async (path: string, payload: any) => {
  // Graceful lazy-init on serverless cold starts
  if (admin.apps.length === 0) {
    initFirebaseAdmin();
  }
  
  if (admin.apps.length === 0) return;
  
  try {
    const db = admin.database();
    const ref = db.ref(path);
    // Merge new data or update timestamp to trigger client listeners
    await ref.update({
      ...payload,
      _updatedAt: admin.database.ServerValue.TIMESTAMP
    });
  } catch (error) {
    console.error(`Firebase Realtime DB update failed for path ${path}:`, error);
  }
};

// Common broadcast helpers for TeachersBank
export const broadcastMemberUpdate = (memberId: string, payload: any = {}) => {
  return broadcastUpdate(`sync/members/${memberId}`, payload);
};

export const broadcastTransaction = (organizationId: string, transactionType: string) => {
  return broadcastUpdate(`sync/orgs/${organizationId}/transactions`, { lastType: transactionType });
};

export const broadcastBalanceUpdate = (userId: string) => {
  return broadcastUpdate(`sync/users/${userId}/balances`, { active: true });
};
