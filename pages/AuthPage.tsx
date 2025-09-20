import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, Button, Input, Spinner } from '../components/ui';
import { Link, useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
  const { user, profile, registerUser, loginUser, logoutUser, googleLogin, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const toggleMode = () => setMode(m => m === 'login' ? 'register' : 'login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') {
        await registerUser(email, password, role, displayName || undefined);
      } else {
        await loginUser(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  // Redirect effect MUST come before any conditional returns to keep hook order stable.
  useEffect(() => {
    if (!loading && user && profile) {
      // Redirect automatically to main dashboard (/) when already authenticated.
      navigate('/', { replace: true });
    }
  }, [loading, user, profile, navigate]);

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // If already logged in we render a tiny placeholder while redirecting
  if (user && profile) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-500">
      <Spinner className="h-8 w-8 text-primary-600" />
      <p className="text-sm">Redirecting…</p>
    </div>
  );

  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">{mode === 'login' ? 'Login' : 'Create Account'}</h2>
  <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <Input id="displayName" label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        )}
        <Input id="email" type="email" label="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input id="password" type="password" label="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="flex space-x-4">
              {['student','teacher'].map(r => (
                <label key={r} className="flex items-center space-x-1 text-sm">
                  <input type="radio" name="role" value={r} checked={role===r} onChange={() => setRole(r as any)} />
                  <span className="capitalize">{r}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <Button type="submit" className="w-full">{mode === 'login' ? 'Login' : 'Register'}</Button>
        <div className="relative my-2 text-center">
          <span className="bg-white px-2 text-xs text-gray-400">OR</span>
          <div className="absolute inset-x-0 top-1/2 border-t border-gray-200 -z-10" />
        </div>
        {mode === 'register' && (
          <Button type="button" variant="secondary" className="w-full" onClick={async () => { setError(''); try { await googleLogin(role); } catch(e: any){ setError(e.message || 'Google sign-in failed'); } }}>Continue with Google</Button>
        )}
        {mode === 'login' && (
          <Button type="button" variant="secondary" className="w-full" onClick={async () => { setError(''); try { await googleLogin(); } catch(e: any){ setError(e.message || 'Google sign-in failed'); } }}>Continue with Google</Button>
        )}
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>
      <button onClick={toggleMode} className="mt-4 text-sm text-primary-600 hover:underline">
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Login'}
      </button>
    </Card>
  );
};

export default AuthPage;
