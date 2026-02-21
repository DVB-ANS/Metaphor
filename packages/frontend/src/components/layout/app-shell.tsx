'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import { StaggeredMenu } from '@/components/ui/staggered-menu';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAuth } from '@/contexts/auth-context';
import { ROUTE_ACCESS, getAccessLevel } from '@/lib/route-access';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const { isAuthenticated, roles } = useAuth();
  const { isConnected } = useAccount();

  const menuItems = useMemo(() => {
    // Wallet not connected — show all items (browsing mode)
    if (!isConnected || !isAuthenticated) {
      return ROUTE_ACCESS.map((route) => ({
        label: route.label,
        href: route.href,
      }));
    }

    // Authenticated — filter by roles
    return ROUTE_ACCESS
      .map((route) => {
        const level = getAccessLevel(route.access, roles);
        return { ...route, level };
      })
      .filter((route) => route.level !== 'hidden')
      .map((route) => ({
        label: route.label,
        href: route.href,
        locked: route.level === 'locked',
      }));
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
          <ConnectButton
            chainStatus="icon"
            accountStatus="address"
            showBalance={false}
          />
        }
      />
      <main className="px-8 pt-24 pb-12">{children}</main>
    </div>
  );
}
