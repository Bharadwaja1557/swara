/**
 * src/components/auth/LoginModal.tsx
 *
 * Full-screen login overlay. Shown only when !isAuthenticated after init.
 * - Username + password only (no email visible, no signup, no forgot password)
 * - Username is internally mapped to username@swara.app by AuthService
 * - Matches Swara dark aesthetic exactly
 */
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const LoginModal = () => {
  const login     = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    try {
      await login(username, password);
      // On success, useAuthStore sets isAuthenticated=true.
      // AppLayout re-renders and hides this modal automatically.
    } catch {
      setError('Invalid username or password.');
    }
  }, [username, password, login]);

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center px-6"
      style={{ background: '#080808' }}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Swara"
    >
      <div className="w-full max-w-[340px]">

        {/* Brand */}
        <div className="text-center mb-12">
          <h1
            className="text-[3rem] font-bold tracking-[-0.05em] font-display"
            style={{ color: '#c8a96e' }}
          >
            swara
          </h1>
          <p className="text-[0.82rem] mt-1.5" style={{ color: '#5c5650' }}>
            Your music, always with you.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="swara-username"
              className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase"
              style={{ color: '#5c5650' }}
            >
              Username
            </label>
            <input
              id="swara-username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="your username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              className="w-full rounded-xl px-4 py-3 text-[0.92rem] outline-none transition-all"
              style={{
                background:   '#111116',
                border:       `1px solid ${error ? '#c0392b44' : 'rgba(255,255,255,0.07)'}`,
                color:        '#e8e4de',
                caretColor:   '#c8a96e',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#c8a96e55')}
              onBlur={(e)  => (e.target.style.borderColor = error ? '#c0392b44' : 'rgba(255,255,255,0.07)')}
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="swara-password"
              className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase"
              style={{ color: '#5c5650' }}
            >
              Password
            </label>
            <div className="relative">
              <input
                id="swara-password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl px-4 py-3 pr-11 text-[0.92rem] outline-none transition-all"
                style={{
                  background:  '#111116',
                  border:      `1px solid ${error ? '#c0392b44' : 'rgba(255,255,255,0.07)'}`,
                  color:       '#e8e4de',
                  caretColor:  '#c8a96e',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#c8a96e55')}
                onBlur={(e)  => (e.target.style.borderColor = error ? '#c0392b44' : 'rgba(255,255,255,0.07)')}
              />
              {/* Show/hide password toggle */}
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center transition-colors"
                style={{ color: '#5c5650' }}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[0.8rem] text-red-400 text-center -mt-1">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading || !username.trim() || !password}
            className="w-full py-3.5 rounded-xl font-semibold text-[0.92rem] transition-all duration-200 mt-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: '#c8a96e',
              color:      '#0a0a0a',
              boxShadow:  isLoading ? 'none' : '0 4px 20px rgba(200,169,110,0.35)',
            }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.25"/>
                  <path d="M3 12a9 9 0 019-9" strokeLinecap="round"/>
                </svg>
                Signing in…
              </span>
            ) : 'Continue'}
          </button>
        </form>

        {/* Footer note — minimal, no auth links */}
        <p className="text-center text-[0.7rem] mt-8" style={{ color: '#3a3830' }}>
          Private access only
        </p>
      </div>
    </div>
  );
};

export default LoginModal;
