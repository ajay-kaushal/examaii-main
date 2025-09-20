<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1QVvsP3fBynLanrTWsCI-h3E7K9mTDfzC

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local` and set the `VITE_API_KEY` to your Gemini API key.
   ```bash
   copy .env.example .env.local  # Windows PowerShell: cp .env.example .env.local also works
   ```
   Edit `.env.local`:
   ```
   VITE_API_KEY=YOUR_REAL_KEY_HERE
   ```
   Notes:
   - The `VITE_` prefix is required for Vite to expose the variable to client-side code.
   - Never commit `.env.local` (it should stay git‑ignored). Use `.env.example` as the template.
3. Run the app:
   `npm run dev`

### Production Build

```
npm run build
npm run preview
```

Provide the same `VITE_API_KEY` in your hosting provider's environment settings (build-time). If you need to keep the key secret from end users, you must proxy requests through a secure backend instead of calling the Gemini API directly from the browser.

## Firebase Setup

Add these additional variables to your `.env.local` (values shown here are placeholders):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

Then consume the initialized app by importing from `services/firebase`:

```ts
import { getFirebaseApp, getFirebaseAnalytics } from './services/firebase';

const app = getFirebaseApp();
getFirebaseAnalytics(); // optional
```

All Firebase config values are public identifiers (not secrets) but you should still avoid committing real keys inside `.env` for clarity—use `.env.example` as template.

## Authentication

This project now includes email/password authentication with simple role assignment (teacher or student) stored in a `users` collection document (no custom claims yet).

### Using Auth
1. Visit `#/auth` to register or login.
2. When registering pick a role (teacher/student). A profile doc is created in `users/{uid}`.
3. Teacher access is required to reach the main exam creation page (`/`). Students can still open direct exam links if shared.
4. Logging out returns you to the Auth page.

### Future Hardening
- Replace role in Firestore with Firebase Custom Claims set via an Admin SDK backend.
- Tighten Firestore rules to restrict writes to teacher accounts only.
- Move answer sheet images to Cloud Storage and restrict per-user access.

See `firestore.rules.dev.txt` for a permissive development ruleset. Do not use it in production as‑is.
