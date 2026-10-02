import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { getStorage, ref, deleteObject, listAll } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Use the provisioned database ID with resilient connection settings (force long polling for iframe/proxy preview environments)
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    },
    firebaseConfigJson.firestoreDatabaseId || undefined
  );
} catch (e) {
  firestoreDb = firebaseConfigJson.firestoreDatabaseId
    ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
    : getFirestore(app);
}

export const db = firestoreDb;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Safely delete any files stored in Firebase Storage for a given user UID or prefix
 */
export async function deleteUserStorageFiles(uid: string): Promise<number> {
  if (!uid || !storage) return 0;
  let deletedCount = 0;
  const prefixes = [`users/${uid}`, `receipts/${uid}`, `deposits/${uid}`, `withdrawals/${uid}`, `avatars/${uid}`];

  for (const prefix of prefixes) {
    try {
      const folderRef = ref(storage, prefix);
      const res = await listAll(folderRef);
      for (const itemRef of res.items) {
        try {
          await deleteObject(itemRef);
          deletedCount++;
        } catch (itemErr) {
          console.warn(`Could not delete storage file ${itemRef.fullPath}:`, itemErr);
        }
      }
    } catch {
      // Folder might not exist or have items, safe to ignore
    }
  }
  return deletedCount;
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  limit,
  ref,
  deleteObject,
  listAll
};
export type { User };
