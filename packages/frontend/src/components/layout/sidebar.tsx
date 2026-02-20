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
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  Sidebar as AceternitySidebar,
  SidebarBody,
  SidebarLink,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/vaults', label: 'My Vaults', icon: Vault },
  { href: '/issue', label: 'Issue Asset', icon: PlusCircle },
  { href: '/data-room', label: 'Data Room', icon: FolderLock },
  { href: '/yield-calendar', label: 'Yield Calendar', icon: CalendarDays },
  { href: '/ai-reports', label: 'AI Reports', icon: Brain },
  { href: '/admin', label: 'Administration', icon: Shield },
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

  const links = navItems.map((item) => {
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
