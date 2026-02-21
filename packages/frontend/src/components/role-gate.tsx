'use client';

import { useAuth, type RoleName } from '@/contexts/auth-context';
import { Shield, Lock } from 'lucide-react';

interface RoleGateProps {
  /** Roles that are allowed to see this content */
  allowed: RoleName[];
  /** Content to show when authorized */
  children: React.ReactNode;
  /** What to show when unauthorized — defaults to a "restricted" message */
  fallback?: React.ReactNode;
  /** If true, don't render anything when unauthorized (instead of the fallback) */
  silent?: boolean;
}

/**
 * Conditionally renders children based on the user's role.
 * If the user is not authenticated, blocks access (sign-in required).
 * If authenticated but lacking the required role, shows a restricted access message.
 */
export function RoleGate({ allowed, children, fallback, silent }: RoleGateProps) {
  const { isAuthenticated, roles } = useAuth();

  if (!isAuthenticated) {
    if (silent) return null;
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-black/10 bg-white p-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-black/10">
          <Lock className="h-5 w-5 text-black/40" />
        </div>
        <h3 className="text-lg font-semibold text-black">Sign In Required</h3>
        <p className="mt-1 text-sm text-black/50">
          Connect your wallet and sign in to access this section.
        </p>
      </div>
    );
  }

  // Check if user has at least one of the allowed roles
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-black/10 bg-white p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-black/10">
        <Lock className="h-5 w-5 text-black/40" />
      </div>
      <h3 className="text-lg font-semibold text-black">Restricted Access</h3>
      <p className="mt-1 text-sm text-black/50">
        This section requires {allowed.join(' or ')} role.
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-black/30">
        <Shield className="h-3.5 w-3.5" />
        Your role{roles.length !== 1 ? 's' : ''}: {roles.length > 0 ? roles.join(', ') : 'none'}
      </div>
    </div>
  );
}

/**
 * Shows content only when user has a specific role.
 * Renders nothing if unauthorized (no fallback message).
 */
export function RoleOnly({ role, children }: { role: RoleName; children: React.ReactNode }) {
  return (
    <RoleGate allowed={[role]} silent>
      {children}
    </RoleGate>
  );
}
