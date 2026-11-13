import React, { useState } from 'react';
import { MailCheck, X } from 'lucide-react';
import { useFirebase } from '../contexts/FirebaseContext';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const {
    user,
    isVerifiedUser,
    authError,
    clearAuthError,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUser,
    signOutUser,
  } = useFirebase();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setInfoMsg(null);
    const ok =
      mode === 'signin'
        ? await signInWithEmail(email, password)
        : await signUpWithEmail(email, password);
    setBusy(false);
    if (ok && mode === 'signin') {
      onClose();
    } else if (ok && mode === 'signup') {
      setInfoMsg('Account created. Check your inbox and click the verification link before syncing.');
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const ok = await signInWithGoogle();
    setBusy(false);
    if (ok) onClose();
  };

  const handleRefresh = async () => {
    setBusy(true);
    const verified = await refreshUser();
    setBusy(false);
    if (verified) {
      onClose();
    } else {
      setInfoMsg('Email is still unverified. Click the link in your inbox, then try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#101218] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {user && !isVerifiedUser
              ? 'Verify Your Email'
              : mode === 'signin'
              ? 'Sign in to ChargerLink'
              : 'Create ChargerLink Account'}
          </h2>
          <button
            type="button"
            onClick={() => {
              clearAuthError();
              onClose();
            }}
            aria-label="Close sign-in dialog"
            className="min-h-[36px] min-w-[36px] rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {user && !isVerifiedUser ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-3.5 text-xs text-amber-100 leading-relaxed">
              <MailCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                A verification email was sent to <strong>{user.email}</strong>. Firestore rules require a
                verified email to sync your Android phone and Windows PC.
              </div>
            </div>
            {infoMsg && <p className="text-xs text-zinc-300">{infoMsg}</p>}
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={handleRefresh}
                className="min-h-[42px] rounded-xl bg-[#E11D2E] hover:bg-[#c81827] text-xs font-semibold text-white"
              >
                I Verified · Continue
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  await resendVerificationEmail();
                  setInfoMsg('Verification email resent.');
                }}
                className="min-h-[42px] rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-100"
              >
                Resend Email
              </button>
            </div>
            <button
              type="button"
              onClick={signOutUser}
              className="w-full text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              Sign out and use another account
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#090A0D] border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  clearAuthError();
                  setInfoMsg(null);
                }}
                className={`min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
                  mode === 'signin' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearAuthError();
                  setInfoMsg(null);
                }}
                className={`min-h-[36px] rounded-md text-xs font-semibold transition-colors ${
                  mode === 'signup' ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="driver@example.com"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-800 bg-[#090A0D] px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full min-h-[42px] rounded-xl border border-zinc-800 bg-[#090A0D] px-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
              </div>

              {authError && (
                <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                  {authError}
                </div>
              )}
              {infoMsg && <div className="text-xs text-emerald-400">{infoMsg}</div>}

              <button
                type="submit"
                disabled={busy}
                className="w-full min-h-[44px] rounded-xl bg-[#E11D2E] hover:bg-[#c81827] disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {busy
                  ? 'Please wait...'
                  : mode === 'signin'
                  ? 'Sign In with Email'
                  : 'Create Account'}
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-zinc-800" />
              <span className="mx-3 text-[11px] text-zinc-500">or</span>
              <div className="flex-grow border-t border-zinc-800" />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full min-h-[42px] rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-100 transition-colors"
            >
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
};
