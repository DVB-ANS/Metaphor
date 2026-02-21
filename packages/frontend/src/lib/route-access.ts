import { type RoleName } from '@/contexts/auth-context';

export type AccessLevel = 'full' | 'locked' | 'hidden';

export interface RouteAccess {
  label: string;
  href: string;
  access: Record<RoleName, AccessLevel>;
}

export const ROUTE_ACCESS: RouteAccess[] = [
  {
    label: 'Dashboard',
    href: '/app',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'full' },
  },
  {
    label: 'Vaults',
    href: '/vaults',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'full' },
  },
  {
    label: 'Issue',
    href: '/issue',
    access: { ADMIN: 'full', AUDITOR: 'hidden', ISSUER: 'full', INVESTOR: 'locked' },
  },
  {
    label: 'Data Room',
    href: '/data-room',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'locked' },
  },
  {
    label: 'Yields',
    href: '/yield-calendar',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'full' },
  },
  {
    label: 'AI Reports',
    href: '/ai-reports',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'locked' },
  },
  {
    label: 'Admin',
    href: '/admin',
    access: { ADMIN: 'full', AUDITOR: 'locked', ISSUER: 'hidden', INVESTOR: 'hidden' },
  },
  {
    label: 'Canton',
    href: '/demo/canton',
    access: { ADMIN: 'full', AUDITOR: 'full', ISSUER: 'full', INVESTOR: 'full' },
  },
];

const ACCESS_PRIORITY: Record<AccessLevel, number> = {
  full: 2,
  locked: 1,
  hidden: 0,
};

export function getAccessLevel(
  routeAccess: Record<RoleName, AccessLevel>,
  userRoles: RoleName[],
): AccessLevel {
  if (userRoles.length === 0) return 'hidden';

  let best: AccessLevel = 'hidden';
  for (const role of userRoles) {
    const level = routeAccess[role] ?? 'hidden';
    if (ACCESS_PRIORITY[level] > ACCESS_PRIORITY[best]) {
      best = level;
    }
  }
  return best;
}

export function getAllowedRoles(route: RouteAccess): RoleName[] {
  return (Object.entries(route.access) as [RoleName, AccessLevel][])
    .filter(([, level]) => level === 'full')
    .map(([role]) => role);
}
