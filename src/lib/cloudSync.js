import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, firebaseEnabled } from './firebase';

const APP_DOC_ID = 'lockin';

function getUserDoc(uid) {
  return doc(db, 'users', uid, 'apps', APP_DOC_ID);
}

export function subscribeToUserAppState(uid, onData, onError) {
  if (!firebaseEnabled || !uid) {
    return () => {};
  }

  return onSnapshot(
    getUserDoc(uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData(snapshot.data());
    },
    onError,
  );
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
