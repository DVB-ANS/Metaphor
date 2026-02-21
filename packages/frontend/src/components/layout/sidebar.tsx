'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vault,
  PlusCircle,
  FolderLock,
  CalendarDays,
  Brain,
  Shield,
  Columns3,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useAuth, type RoleName } from '@/contexts/auth-context';

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: RoleName[];
}[] = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vaults', label: 'My Vaults', icon: Vault, roles: ['ADMIN', 'ISSUER', 'INVESTOR'] },
  { href: '/issue', label: 'Issue Asset', icon: PlusCircle, roles: ['ADMIN', 'ISSUER'] },
  { href: '/data-room', label: 'Data Room', icon: FolderLock },
  { href: '/yield-calendar', label: 'Yield Calendar', icon: CalendarDays, roles: ['ADMIN', 'ISSUER', 'INVESTOR'] },
  { href: '/ai-reports', label: 'AI Reports', icon: Brain, roles: ['ADMIN', 'ISSUER', 'AUDITOR'] },
  { href: '/admin', label: 'Administration', icon: Shield, roles: ['ADMIN'] },
  { href: '/demo/canton', label: 'Canton Demo', icon: Columns3 },
];

const Logo = () => (
  <a
    href="/"
    className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
  >
    <img src="/logo.png" alt="Metaphor" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-semibold whitespace-pre text-foreground tracking-tight"
    >
      Metaphor
    </motion.span>
  </a>
);

const LogoIcon = () => (
  <a
    href="/"
    className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal"
  >
    <img src="/logo.png" alt="Metaphor" className="h-7 w-7 shrink-0 rounded-lg object-contain" />
  </a>
);

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, roles } = useAuth();

  // Filter nav items based on user roles
  // Unauthenticated users see all items (so they can browse)
  const visibleItems = navItems.filter((item) => {
    if (!item.roles || !isAuthenticated) return true;
    return item.roles.some((role) => roles.includes(role));
  });

  const links = visibleItems.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

    return {
      label: item.label,
      href: item.href,
      icon: (
        <item.icon
          className={cn(
            'h-5 w-5 shrink-0',
            isActive
              ? 'text-primary'
              : 'text-neutral-700 dark:text-neutral-200'
          )}
        />
      ),
    };
  });

  return (
    <AceternitySidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-10 border-r border-border bg-sidebar">
        <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          {open ? <Logo /> : <LogoIcon />}
          <div className="mt-8 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>
        <div>
          <div className={cn(
            'rounded-lg bg-muted/50 px-2 py-2',
            !open && 'px-0 py-0'
          )}>
            {open ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-xs font-medium text-muted-foreground">Metaphor v0.1.0</p>
                <p className="text-xs text-muted-foreground/70">ETHDenver 2026</p>
              </motion.div>
            ) : (
              <p className="text-center text-[8px] text-muted-foreground/50">v0.1</p>
            )}
          </div>
        </div>
      </SidebarBody>
    </AceternitySidebar>
  );
}
