import { getFirebaseApp } from './firebase';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, User, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';

export interface AppUserProfile {
  uid: string;
  role: 'teacher' | 'student';
  displayName?: string;
  email?: string;
  geminiApiKey?: string; // stored per user (client-visible); consider server proxy for production security
}

const auth = getAuth(getFirebaseApp());

// Users collection holds role (since we are not using custom claims yet)
async function ensureUserProfile(user: User, role?: 'teacher' | 'student'): Promise<AppUserProfile> {
  const ref = doc(getDb(), 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const assignedRole: 'teacher' | 'student' = role || 'student';
    const profile: AppUserProfile = { uid: user.uid, role: assignedRole, displayName: user.displayName || undefined, email: user.email || undefined };
    await setDoc(ref, profile);
    return profile;
  }
  return snap.data() as AppUserProfile;
}

export function observeAuth(callback: (user: User | null, profile: AppUserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    try {
      const ref = doc(getDb(), 'users', user.uid);
      const snap = await getDoc(ref);
      callback(user, snap.exists() ? (snap.data() as AppUserProfile) : null);
    } catch (err: any) {
      // Permission denied or network error: still surface authenticated user so UI can react
      console.warn('Failed to fetch user profile document; proceeding with basic user.', err);
      const fallback: AppUserProfile = { uid: user.uid, role: 'student', displayName: user.displayName || undefined, email: user.email || undefined };
      callback(user, fallback);
    }
  });
}

export async function register(email: string, password: string, role: 'teacher' | 'student', displayName?: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  await ensureUserProfile(cred.user, role);
  return cred.user;
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function loginWithGoogle(role?: 'teacher' | 'student') {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await signInWithPopup(auth, provider);
    await ensureUserProfile(cred.user, role);
    return cred.user;
  } catch (err: any) {
    // Some browsers / extension contexts block window.close due to COOP or popup blockers.
    const code = err?.code || '';
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || /window.close/i.test(err?.message || '')) {
      // Fallback to redirect flow
      await signInWithRedirect(auth, provider);
      return new Promise<User>((resolve, reject) => {
        // Redirect result will be picked up after navigation; expose helper timeout.
        const timer = setTimeout(() => reject(new Error('Google redirect sign-in taking longer than expected. Refresh if stuck.')), 60000);
        getRedirectResult(auth)
          .then(async result => {
            if (result?.user) {
              clearTimeout(timer);
              await ensureUserProfile(result.user, role);
              resolve(result.user);
            }
          })
          .catch(e => {
            clearTimeout(timer);
            reject(e);
          });
      });
    }
    // Surface more actionable messages
    if (code === 'auth/unauthorized-domain') {
      throw new Error('Unauthorized domain: Add this app origin to the Firebase auth authorized domains in the console.');
    }
    if (code === 'auth/account-exists-with-different-credential') {
      throw new Error('Account exists with different credential. Try logging in with the original provider or link accounts.');
    }
    throw err;
  }
}

// Update only the geminiApiKey for the current user
export async function updateUserProfileGeminiKey(user: User, geminiApiKey?: string) {
  if (!user) throw new Error('No authenticated user.');
  // Ensure profile exists (assign default student if new)
  const profile = await ensureUserProfile(user);
  const ref = doc(getDb(), 'users', user.uid);
  await setDoc(ref, { ...profile, geminiApiKey }, { merge: true });
  return geminiApiKey;
}
