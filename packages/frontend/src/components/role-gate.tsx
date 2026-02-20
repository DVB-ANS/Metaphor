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
 * If the user is not authenticated, shows nothing (users need to sign in first).
 * If authenticated but lacking the required role, shows a restricted access message.
 */
export function RoleGate({ allowed, children, fallback, silent }: RoleGateProps) {
  const { isAuthenticated, roles } = useAuth();

  // If not authenticated, show children by default (pages have their own auth prompts)
  // Role gating only applies to authenticated users
  if (!isAuthenticated) {
    return <>{children}</>;
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 p-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800">
        <Lock className="h-6 w-6 text-neutral-500" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-200">Restricted Access</h3>
      <p className="mt-1 text-sm text-neutral-500">
        This section requires {allowed.join(' or ')} role.
      </p>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-neutral-600">
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
