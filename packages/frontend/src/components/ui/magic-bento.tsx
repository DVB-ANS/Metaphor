'use client';

import { useRef, useEffect, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import './magic-bento.css';

const SPOTLIGHT_RADIUS = 500;

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!gridRef.current) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'bento-spotlight';
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const grid = gridRef.current;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return;

      const rect = grid.getBoundingClientRect();
      const mouseInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      const cards = grid.querySelectorAll<HTMLElement>('.bento-card');

      if (!mouseInside) {
        spotlightRef.current.style.opacity = '0';
        cards.forEach((card) => {
          card.style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      spotlightRef.current.style.left = `${e.clientX}px`;
      spotlightRef.current.style.top = `${e.clientY}px`;

      const proximity = SPOTLIGHT_RADIUS * 0.5;
      const fadeDistance = SPOTLIGHT_RADIUS * 0.75;
      let minDistance = Infinity;

      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) -
          Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);
        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity =
            (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        const relativeX =
          ((e.clientX - cardRect.left) / cardRect.width) * 100;
        const relativeY =
          ((e.clientY - cardRect.top) / cardRect.height) * 100;

        card.style.setProperty('--glow-x', `${relativeX}%`);
        card.style.setProperty('--glow-y', `${relativeY}%`);
        card.style.setProperty('--glow-intensity', glowIntensity.toString());
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.9
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.9
            : 0;

      spotlightRef.current.style.opacity = targetOpacity.toString();
    };

    const handleMouseLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
      grid.querySelectorAll<HTMLElement>('.bento-card').forEach((card) => {
        card.style.setProperty('--glow-intensity', '0');
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      spotlightRef.current?.remove();
    };
  }, []);

  return (
    <div className={className} ref={gridRef}>
      {children}
    </div>
  );
}

export function BentoCard({ children, className }: BentoCardProps) {
  return (
    <div
      className={cn(
        'bento-card rounded-xl border border-neutral-800 bg-neutral-900 p-2 shadow',
        className,
      )}
    >
      {children}
    </div>
  );
}
