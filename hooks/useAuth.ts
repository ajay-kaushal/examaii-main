import { useEffect, useState, useCallback } from 'react';
import { observeAuth, register, login, logout, loginWithGoogle, AppUserProfile, updateUserProfileGeminiKey } from '../services/authService';
import type { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  profile: AppUserProfile | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    const unsub = observeAuth((user, profile) => {
      setState({ user, profile, loading: false });
    });
    return () => unsub();
  }, []);

  const registerUser = useCallback((email: string, password: string, role: 'teacher' | 'student', displayName?: string) => {
    return register(email, password, role, displayName);
  }, []);

  const loginUser = useCallback((email: string, password: string) => {
    return login(email, password);
  }, []);

  const logoutUser = useCallback(() => logout(), []);
  const googleLogin = useCallback((role?: 'teacher' | 'student') => loginWithGoogle(role), []);
  const setGeminiApiKey = useCallback(async (apiKey?: string) => {
    if (!state.user) throw new Error('Not authenticated');
    await updateUserProfileGeminiKey(state.user, apiKey);
    // Refresh local profile state immutably
    setState(prev => ({ ...prev, profile: prev.profile ? { ...prev.profile, geminiApiKey: apiKey } : prev.profile }));
  }, [state.user]);

  return { ...state, registerUser, loginUser, logoutUser, googleLogin, setGeminiApiKey };
}
