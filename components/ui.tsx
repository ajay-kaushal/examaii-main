
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export const Header: React.FC = () => {
  const { user, profile, logoutUser, setGeminiApiKey } = useAuth();
  const [apiKeyEditing, setApiKeyEditing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const maskedKey = profile?.geminiApiKey ? profile.geminiApiKey.slice(0, 6) + '…' + profile.geminiApiKey.slice(-4) : '';
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const roleLabel = profile?.role === 'teacher' ? 'Teacher' : profile?.role === 'student' ? 'Student' : 'Guest';
  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

  const avatarInitials = displayName
    .split(/\s+/)
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="leading-tight">
          <h1 className="text-2xl font-semibold text-primary-800 tracking-tight">AI Exam Proctor</h1>
          <p className="hidden sm:block text-xs text-gray-500 mt-0.5">Create & grade exams with AI.</p>
        </div>
  {user && (
  <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center space-x-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 group"
            aria-haspopup="true"
            aria-expanded={open}
          >
            <span className="hidden sm:flex flex-col items-end leading-tight mr-1">
              <span className="text-xs font-medium text-gray-700">{displayName}</span>
              <span className="text-[10px] text-gray-500">{roleLabel}</span>
            </span>
            <div className="h-8 w-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold ring-2 ring-primary-300 group-hover:ring-primary-400 shadow">
              {avatarInitials}
            </div>
            <svg className={`h-4 w-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.108l3.71-3.877a.75.75 0 111.08 1.04l-4.25 4.444a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
          {open && (
            <div
              className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-40"
              role="menu"
            >
              <div className="px-4 py-2 border-b border-gray-100 space-y-1">
                <p className="text-sm font-medium text-gray-800">{displayName}</p>
                <p className="text-xs text-gray-500">{roleLabel}</p>
                <div className="pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Gemini API Key</p>
                  {!apiKeyEditing && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">
                        {profile?.geminiApiKey ? maskedKey : 'Not set'}
                      </span>
                      <button
                        onClick={() => { setApiKeyEditing(true); setApiKeyInput(profile?.geminiApiKey || ''); }}
                        className="text-primary-600 text-xs font-medium hover:underline"
                      >{profile?.geminiApiKey ? 'Edit' : 'Add'}</button>
                    </div>
                  )}
                  {apiKeyEditing && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setSavingKey(true);
                        try {
                          await setGeminiApiKey(apiKeyInput.trim() || undefined);
                          setApiKeyEditing(false);
                        } finally {
                          setSavingKey(false);
                        }
                      }}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        placeholder="Paste API key"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="w-full border rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <div className="flex items-center justify-end space-x-2">
                        {profile?.geminiApiKey && (
                          <button
                            type="button"
                            onClick={async () => { setSavingKey(true); try { await setGeminiApiKey(undefined); setApiKeyInput(''); setApiKeyEditing(false); } finally { setSavingKey(false); } }}
                            className="text-xs text-red-600 hover:underline"
                          >Remove</button>
                        )}
                        <button
                          type="button"
                          onClick={() => setApiKeyEditing(false)}
                          className="text-xs text-gray-500 hover:underline"
                        >Cancel</button>
                        <button
                          type="submit"
                          disabled={savingKey || !apiKeyInput.trim()}
                          className="text-xs bg-primary-600 text-white px-2 py-1 rounded-md disabled:opacity-50"
                        >{savingKey ? 'Saving…' : 'Save'}</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
              {user ? (
                <button
                  onClick={() => { logoutUser(); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                  role="menuitem"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 16l-4-4 4-4" />
                    <path d="M5 12h11" />
                    <path d="M13 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" />
                  </svg>
                  <span>Logout</span>
                </button>
              ) : (
                <div className="px-4 py-2 text-xs text-gray-500">Not signed in</div>
              )}
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => (
  <div className={`bg-white shadow-lg rounded-xl overflow-hidden ${className}`}>
    {children}
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  isLoading = false,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200";
  
  const variantClasses = {
    primary: 'text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'text-primary-700 bg-primary-100 hover:bg-primary-200 focus:ring-primary-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
};


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="mt-1">
      <input
        id={id}
        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        {...props}
      />
    </div>
  </div>
);

export const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin h-5 w-5 text-white ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
  requirePhrase?: string;
}> = ({ open, title, description, confirmLabel = 'Confirm', onCancel, onConfirm, busy, requirePhrase }) => {
  const [phrase, setPhrase] = React.useState('');
  React.useEffect(() => { if (!open) setPhrase(''); }, [open]);
  if (!open) return null;
  const disabled = busy || (requirePhrase && phrase !== requirePhrase);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border">
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-bold text-red-600">{title}</h2>
          <div className="text-sm text-gray-700 space-y-2">{description}</div>
          {requirePhrase && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Type <span className="font-mono">{requirePhrase}</span> to proceed</label>
              <input
                type="text"
                value={phrase}
                onChange={e => setPhrase(e.target.value)}
                className="w-full border rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
            <Button onClick={onConfirm} disabled={disabled} isLoading={busy} className="bg-red-600 hover:bg-red-700">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const FileInput: React.FC<{id: string, label: string, onChange: (file: File | null) => void, accept?: string}> = ({ id, label, onChange, accept }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor={id} className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                            <span>Upload a file</span>
                            <input id={id} name={id} type="file" className="sr-only" accept={accept} onChange={(e) => onChange(e.target.files ? e.target.files[0] : null)} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
            </div>
        </div>
    );
};
