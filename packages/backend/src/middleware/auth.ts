import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import type { AuthPayload } from '../types/auth.js';

if (!process.env.JWT_SECRET) throw new Error('Missing JWT_SECRET in .env — required for authentication');
const JWT_SECRET: string = process.env.JWT_SECRET;
const JWT_EXPIRY = '24h';

// In-memory nonce store: address → { nonce, createdAt }
const nonceStore = new Map<string, { nonce: string; createdAt: number }>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Nonce Management ────────────────────────────────────────

export function generateNonce(address: string): string {
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  nonceStore.set(address.toLowerCase(), { nonce, createdAt: Date.now() });
  return nonce;
}

export function consumeNonce(address: string): string | null {
  const entry = nonceStore.get(address.toLowerCase());
  if (!entry) return null;

  if (Date.now() - entry.createdAt > NONCE_TTL_MS) {
    nonceStore.delete(address.toLowerCase());
    return null;
  }

  nonceStore.delete(address.toLowerCase());
  return entry.nonce;
}

// ─── Signature Verification ──────────────────────────────────

export function verifySignature(message: string, signature: string, expectedAddress: string): boolean {
  try {
    const recovered = ethers.verifyMessage(message, signature);
    return recovered.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

export function buildSignMessage(address: string, nonce: string): string {
  return `Sign this message to authenticate with Metaphor.\n\nWallet: ${address}\nNonce: ${nonce}`;
}

// ─── JWT ─────────────────────────────────────────────────────

export function signToken(address: string, roles: string[]): string {
  return jwt.sign({ address: address.toLowerCase(), roles }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

// ─── Express Middleware ──────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * Middleware: Requires a valid JWT in the Authorization header.
 * Populates req.auth with { address, roles }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.auth = payload;
  next();
}

/**
 * Middleware: Optional auth — populates req.auth if token present, but doesn't block.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    const payload = verifyToken(token);
    if (payload) req.auth = payload;
  }
  next();
}
