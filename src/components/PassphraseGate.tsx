'use client';

import { useState, useRef, FormEvent } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { APP_NAME } from '@/lib/constants';

export function PassphraseGate() {
  const unlock = useAuthStore((s) => s.unlock);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim() || loading) return;

    setLoading(true);
    setError(false);

    const correct = await unlock(value);
    setLoading(false);

    if (!correct) {
      setError(true);
      setShake(true);
      setValue('');
      setTimeout(() => setShake(false), 500);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-8 pt-safe pb-safe">
      {/* Logo / wordmark */}
      <div className="mb-12 text-center">
        <div className="mb-4 flex items-center justify-center">
          <SwaraLogo />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-text">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-text-secondary text-sm font-light">
          Your personal music space
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4"
      >
        <div
          className={`relative transition-all duration-200 ${
            shake ? 'animate-[shake_0.4s_ease]' : ''
          }`}
        >
          <input
            ref={inputRef}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Enter passphrase"
            autoComplete="current-password"
            autoFocus
            className={`
              w-full h-14 px-5 rounded-2xl bg-bg-surface
              text-text text-base font-medium placeholder:text-text-muted
              border transition-all duration-200 outline-none
              focus:border-accent focus:ring-2 focus:ring-accent/20
              ${error
                ? 'border-red-500/60 ring-2 ring-red-500/20'
                : 'border-border'
              }
            `}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center animate-fade-in">
            Wrong passphrase. Try again.
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !value.trim()}
          className={`
            h-14 rounded-2xl font-semibold text-base transition-all duration-200
            flex items-center justify-center gap-2
            ${
              loading || !value.trim()
                ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent/90 active:scale-[0.97] shadow-accent-glow'
            }
          `}
        >
          {loading ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <>
              Enter
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Footer hint */}
      <p className="mt-16 text-text-muted text-xs text-center">
        Private access only
      </p>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

function SwaraLogo() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      {/* Outer ring */}
      <circle cx="26" cy="26" r="24" stroke="#4f8ef7" strokeWidth="1.5" strokeOpacity="0.3" />
      {/* Inner sound wave bars */}
      <rect x="15" y="20" width="3" height="12" rx="1.5" fill="#4f8ef7" opacity="0.5" />
      <rect x="20" y="16" width="3" height="20" rx="1.5" fill="#4f8ef7" opacity="0.7" />
      <rect x="25" y="12" width="3" height="28" rx="1.5" fill="#4f8ef7" />
      <rect x="30" y="16" width="3" height="20" rx="1.5" fill="#4f8ef7" opacity="0.7" />
      <rect x="35" y="20" width="3" height="12" rx="1.5" fill="#4f8ef7" opacity="0.5" />
    </svg>
  );
}
