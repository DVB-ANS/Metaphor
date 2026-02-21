'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { StaggeredMenu } from '@/components/ui/staggered-menu';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth, type RoleName } from '@/contexts/auth-context';

interface AppMenuItem {
  label: string;
  href: string;
  roles?: RoleName[];
}

const allMenuItems: AppMenuItem[] = [
  { label: 'Dashboard', href: '/app' },
  { label: 'Vaults', href: '/vaults', roles: ['ADMIN', 'ISSUER', 'INVESTOR'] },
  { label: 'Issue', href: '/issue', roles: ['ADMIN', 'ISSUER'] },
  { label: 'Data Room', href: '/data-room' },
  { label: 'Yields', href: '/yield-calendar', roles: ['ADMIN', 'ISSUER', 'INVESTOR'] },
  { label: 'AI Reports', href: '/ai-reports', roles: ['ADMIN', 'ISSUER', 'AUDITOR'] },
  { label: 'Admin', href: '/admin', roles: ['ADMIN'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { isConnected } = useAccount();
  const { isAuthenticated, roles, signIn, isSigningIn } = useAuth();

  const filteredItems = useMemo(() => {
    return allMenuItems
      .filter((item) => {
        if (!item.roles) return true;
        if (!isAuthenticated) return false;
        return item.roles.some((r) => roles.includes(r));
      })
      .map(({ label, href }) => ({ label, href }));
  }, [isAuthenticated, roles]);

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
        items={filteredItems}
        position="right"
        colors={['#e8e8e8', '#d4d4d4']}
        accentColor="#000"
        menuButtonColor="#111"
        isFixed
        displayItemNumbering
        extraHeader={
          <div className="flex items-center gap-3">
            {isAuthenticated && roles.length > 0 && (
              <span className="text-xs tracking-wide text-black/40">
                {roles.join(' · ')}
              </span>
            )}
            {isConnected && !isAuthenticated && (
              <button
                onClick={signIn}
                disabled={isSigningIn}
                className="rounded border border-black/20 px-3 py-1 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white disabled:opacity-50"
              >
                {isSigningIn ? 'Signing…' : 'Sign In'}
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
