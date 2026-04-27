import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

const APP_DOC_ID = 'lockin';

function getUserDoc(uid) {
  return doc(db, 'users', uid, 'apps', APP_DOC_ID);
}

export async function fetchUserAppState(uid) {
  if (!firebaseEnabled || !uid) {
    return null;
  }

  const snapshot = await getDoc(getUserDoc(uid));
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function saveUserAppState(uid, state) {
  if (!firebaseEnabled || !uid) return;

  await setDoc(
    getUserDoc(uid),
    {
      ...state,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function normalizeCloudState(data) {
  if (!data) return null;

  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    classes: Array.isArray(data.classes) ? data.classes : [],
    gpa: {
      junior: data.gpa?.junior || {},
      senior: data.gpa?.senior || {},
    },
  };
}
