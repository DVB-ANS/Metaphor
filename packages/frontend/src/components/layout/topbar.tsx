'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useAuth } from '@/contexts/auth-context';
import { LogIn, LogOut, Loader2, ShieldCheck } from 'lucide-react';

export function Topbar() {
  const { isConnected } = useAccount();
  const { isAuthenticated, isSigningIn, roles, signIn, signOut, error } = useAuth();

  // Avoid hydration mismatch: wallet state differs between server and client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-2">
        {mounted && isAuthenticated && roles.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-neutral-800/50 px-2.5 py-1">
            <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-medium text-neutral-400">
              {roles.join(', ')}
            </span>
          </div>
        )}
        {error && (
          <span className="text-xs text-red-400">{error}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {mounted && isConnected && !isAuthenticated && (
          <button
            onClick={signIn}
            disabled={isSigningIn}
            className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-200 transition-colors hover:bg-neutral-700 disabled:opacity-50"
          >
            {isSigningIn ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            Sign In
          </button>
        )}
        {mounted && isAuthenticated && (
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        )}
        <ConnectButton
          chainStatus="icon"
          accountStatus="address"
          showBalance={false}
        />
      </div>
    </header>
  );
}
