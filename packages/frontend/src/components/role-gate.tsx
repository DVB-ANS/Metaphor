'use client';

import { useState, useEffect } from 'react';
import { useAuth, type RoleName } from '@/contexts/auth-context';
import { useAccount } from 'wagmi';
import { Shield, Lock } from 'lucide-react';

interface RoleGateProps {
  allowed: RoleName[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  silent?: boolean;
}

export function RoleGate({ allowed, children, fallback, silent }: RoleGateProps) {
  const { isAuthenticated, isSigningIn, roles, error, signIn } = useAuth();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // SSR / pre-hydration: render nothing to avoid mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-black/30 animate-pulse">Loading...</p>
      </div>
    );
  }

  // Not connected — block access (strict mode)
  if (!isConnected) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center border border-black/[0.06] bg-white p-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-black/[0.06]">
          <Lock className="h-5 w-5 text-black/20" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-black">
          Sign In Required
        </h3>
        <p className="mt-2 text-sm text-black/45">
          Connect your wallet and sign in to access this section.
        </p>
      </div>
    );
  }

  // Signing in progress — show loading
  if (isSigningIn) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-black/30 animate-pulse">Signing in...</p>
      </div>
    );
  }

  // Wallet connected but sign-in failed or not yet done
  if (!isAuthenticated) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center border border-black/[0.06] bg-white p-16 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-black/[0.06]">
          <Lock className="h-5 w-5 text-black/20" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-black">
          Sign In Required
        </h3>
        <p className="mt-2 text-sm text-black/45">
          Please sign the message in your wallet to verify your identity.
        </p>
        {error && (
          <p className="mt-2 text-xs text-black/30">{error}</p>
        )}
        <button
          onClick={signIn}
          className="mt-4 text-xs font-medium text-black border border-black/15 px-4 py-2 hover:bg-black hover:text-white transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Authenticated — check roles
  const hasAccess = allowed.some((role) => roles.includes(role));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (silent) {
    return null;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center border border-black/[0.06] bg-white p-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center border border-black/[0.06]">
        <Lock className="h-5 w-5 text-black/20" />
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-widest text-black">
        Restricted Access
      </h3>
      <p className="mt-2 text-sm text-black/45">
        This section requires {allowed.join(' or ')} role.
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-black/30">
        <Shield className="h-3.5 w-3.5" />
        Your role{roles.length !== 1 ? 's' : ''}: {roles.length > 0 ? roles.join(', ') : 'none'}
      </div>
    </div>
  );
}

export function RoleOnly({ role, children }: { role: RoleName; children: React.ReactNode }) {
  return (
    <RoleGate allowed={[role]} silent>
      {children}
    </RoleGate>
  );
}
