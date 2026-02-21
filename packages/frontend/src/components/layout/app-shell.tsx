'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { StaggeredMenu } from '@/components/ui/staggered-menu';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/contexts/auth-context';
import { ROUTE_ACCESS, getAccessLevel } from '@/lib/route-access';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { isAuthenticated, roles, signIn, isSigningIn, error: authError } = useAuth();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const menuItems = useMemo(() => {
    // Not authenticated — only show public routes
    if (!isConnected || !isAuthenticated) {
      return ROUTE_ACCESS
        .filter((route) => route.public)
        .map((route) => ({ label: route.label, href: route.href }));
    }

    // Authenticated — filter by roles, hide items with 'hidden' access
    return ROUTE_ACCESS
      .map((route) => {
        const level = getAccessLevel(route.access, roles);
        return { ...route, level };
      })
      .filter((route) => route.level !== 'hidden')
      .map((route) => ({ label: route.label, href: route.href }));
  }, [isConnected, isAuthenticated, roles]);

  useEffect(() => {
    if (!isLanding) {
      document.documentElement.style.backgroundColor = '#FDFDFD';
      document.body.style.backgroundColor = '#FDFDFD';
      return () => {
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
      };
    }
  }, [isLanding]);

  if (isLanding) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen bg-[#FDFDFD]">
      <StaggeredMenu
        items={menuItems}
        position="right"
        colors={['#e8e8e8', '#d4d4d4']}
        accentColor="#000"
        menuButtonColor="#111"
        isFixed
        displayItemNumbering
        extraHeader={
          <div className="flex items-center gap-3">
            {authError && (
              <span className="text-xs text-red-500">{authError}</span>
            )}
            {mounted && isAuthenticated && roles.length > 0 && (
              <span className="text-xs tracking-wide text-black/40">
                {roles.join(' · ')}
              </span>
            )}
            {mounted && isConnected && !isAuthenticated && (
              <button
                onClick={signIn}
                disabled={isSigningIn}
                className="rounded border border-black/20 px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {isSigningIn ? 'Signing\u2026' : 'Sign In'}
              </button>
            )}
            <ConnectButton
              chainStatus="icon"
              accountStatus="address"
              showBalance={false}
            />
          </div>
        }
      />
      <main className="px-8 pt-24 pb-12">{children}</main>
    </div>
  );
}
