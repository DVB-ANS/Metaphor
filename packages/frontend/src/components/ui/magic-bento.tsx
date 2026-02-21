'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return <div className={className}>{children}</div>;
}

export function BentoCard({ children, className }: BentoCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-black/[0.06] bg-white p-2 shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  );
}
