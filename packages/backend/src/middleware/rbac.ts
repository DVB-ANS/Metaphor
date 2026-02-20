import { type Request, type Response, type NextFunction } from 'express';
import { ethers } from 'ethers';
import { getContract, ADDRESSES } from '../config.js';
import type { RoleName } from '../types/auth.js';

// Role hashes matching InstiVaultAccessControl.sol — computed via keccak256
const ROLE_HASHES: Record<RoleName, string> = {
  ADMIN: ethers.id('ADMIN_ROLE'),
  ISSUER: ethers.id('ISSUER_ROLE'),
  INVESTOR: ethers.id('INVESTOR_ROLE'),
  AUDITOR: ethers.id('AUDITOR_ROLE'),
};

/**
 * Middleware factory: Requires the authenticated wallet to hold at least one of the specified roles
 * on the ADI AccessControl contract.
 *
 * First checks the JWT roles claim (fast path), then verifies on-chain if needed.
 */
export function requireRole(...roles: RoleName[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Fast path: check JWT claim
    const hasJwtRole = roles.some((role) => req.auth!.roles.includes(role));
    if (hasJwtRole) {
      next();
      return;
    }

    // On-chain verification fallback (if AccessControl is deployed)
    if (!ADDRESSES.accessControl) {
      res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
      return;
    }

    try {
      const ac = getContract('AccessControl', ADDRESSES.accessControl);
      for (const role of roles) {
        const has: boolean = await ac.hasRole(ROLE_HASHES[role], req.auth.address);
        if (has) {
          // Update JWT roles for future fast-path
          if (!req.auth.roles.includes(role)) {
            req.auth.roles.push(role);
          }
          next();
          return;
        }
      }
      res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
    } catch (err) {
      res.status(500).json({ error: `Role verification failed: ${(err as Error).message}` });
    }
  };
}

/**
 * Middleware: Requires the authenticated wallet to be whitelisted on the ADI AccessControl contract.
 */
export function requireWhitelist() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!ADDRESSES.accessControl) {
      // Skip whitelist check if no AccessControl deployed (dev mode)
      next();
      return;
    }

    try {
      const ac = getContract('AccessControl', ADDRESSES.accessControl);
      const whitelisted: boolean = await ac.isWhitelisted(req.auth.address);
      if (!whitelisted) {
        res.status(403).json({ error: 'Wallet not whitelisted' });
        return;
      }
      next();
    } catch (err) {
      res.status(500).json({ error: `Whitelist check failed: ${(err as Error).message}` });
    }
  };
}

/**
 * Fetches all roles for a given wallet address from the ADI AccessControl contract.
 * Returns role names the wallet holds.
 */
export async function fetchWalletRoles(address: string): Promise<RoleName[]> {
  if (!ADDRESSES.accessControl) return [];

  try {
    const ac = getContract('AccessControl', ADDRESSES.accessControl);
    const roles: RoleName[] = [];

    for (const [name, hash] of Object.entries(ROLE_HASHES)) {
      const has: boolean = await ac.hasRole(hash, address);
      if (has) roles.push(name as RoleName);
    }

    return roles;
  } catch {
    return [];
  }
}
