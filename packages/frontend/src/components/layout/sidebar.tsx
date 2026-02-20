'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vault,
  PlusCircle,
  FolderLock,
  CalendarDays,
  Brain,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vaults', label: 'My Vaults', icon: Vault },
  { href: '/issue', label: 'Issue Asset', icon: PlusCircle },
  { href: '/data-room', label: 'Data Room', icon: FolderLock },
  { href: '/yield-calendar', label: 'Yield Calendar', icon: CalendarDays },
  { href: '/ai-reports', label: 'AI Reports', icon: Brain },
  { href: '/admin', label: 'Administration', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          IV
        </div>
        <span className="text-lg font-semibold tracking-tight">InstiVault</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4">
        <div className="rounded-lg bg-muted/50 px-3 py-3">
          <p className="text-xs font-medium text-muted-foreground">InstiVault v0.1.0</p>
          <p className="text-xs text-muted-foreground/70">ETHDenver 2026</p>
        </div>
      </div>
    </aside>
  );
}
