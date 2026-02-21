'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { StaggeredMenu } from '@/components/ui/staggered-menu';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const menuItems = [
  { label: 'Dashboard', href: '/app' },
  { label: 'Vaults', href: '/vaults' },
  { label: 'Issue', href: '/issue' },
  { label: 'Data Room', href: '/data-room' },
  { label: 'Yields', href: '/yield-calendar' },
  { label: 'AI Reports', href: '/ai-reports' },
  { label: 'Admin', href: '/admin' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

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
