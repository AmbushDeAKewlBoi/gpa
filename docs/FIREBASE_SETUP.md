# Firebase Setup For LockIn

This app is now wired for optional Firebase Auth + Firestore sync.

If Firebase env vars are missing, LockIn stays in local-only mode and keeps using browser storage.

## What This Setup Does

- Google sign-in for account-based sync
- Firestore document per user
- Local fallback when Firebase is not configured
- Same LockIn UI, just with cloud sync when available

## 1. Create Firebase Project

Use the Firebase console and create a project, then register a web app.

Official docs:

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/firestore/quickstart

## 2. Enable Authentication

In Firebase Console:

1. Go to `Build -> Authentication`
2. Click `Get started`
3. Enable `Google`
4. Add your production domain when needed

For local development, `localhost` is typically already supported for popup sign-in.

## 3. Enable Firestore

In Firebase Console:

1. Go to `Build -> Firestore Database`
2. Click `Create database`
3. Choose a region
4. Start in test mode only for initial setup, then lock it down

## 4. Add Environment Variables

Create a local `.env` file in the repo root using `.env.example`.

Required keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Restart the dev server after adding them.

## 5. Firestore Data Shape

Each user syncs into:

- `users/{uid}/apps/lockin`

Stored fields:

- `tasks`
- `classes`
- `gpa.junior`
- `gpa.senior`
- `updatedAt`

## 6. Security Rules

Use rules like this once auth is enabled:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/apps/{appId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This follows Firebase's guidance to combine Firebase Authentication with Firestore Security Rules for user-owned data.

Reference:

- https://firebase.google.com/docs/firestore/security/get-started

## 7. Hosting Domain Note

If you keep using GitHub Pages, make sure your Firebase Auth authorized domains include the Pages domain:

- `ambushdeakewlboi.github.io`

## 8. Expected App Behavior

- No Firebase config: local mode only
- Firebase config present, signed out: local mode until user signs in
- Signed in: app syncs tasks, classes, and GPA data to Firestore

## 9. Next Recommended Upgrade

After this works, the next clean improvement is replacing local-only task ownership with full user bootstrap logic:

- optional first-sync import from local storage
- profile display
- better sync conflict handling
