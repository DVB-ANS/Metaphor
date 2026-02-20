import { Router, type Request, type Response, type Router as RouterType } from 'express';
import {
  generateNonce,
  consumeNonce,
  verifySignature,
  buildSignMessage,
  signToken,
  requireAuth,
} from '../middleware/auth.js';
import { fetchWalletRoles } from '../middleware/rbac.js';
import type { LoginBody } from '../types/auth.js';

export const authRouter: RouterType = Router();

// POST /api/auth/nonce — Generate a nonce for the wallet to sign
authRouter.post('/nonce', (req: Request, res: Response) => {
  const { address } = req.body;
  if (!address) {
    res.status(400).json({ error: 'Missing address' });
    return;
  }

  const nonce = generateNonce(address);
  const message = buildSignMessage(address, nonce);

  res.json({ nonce, message });
});

// POST /api/auth/login — Verify signature and return JWT
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { address, signature, message } = req.body as LoginBody;

    if (!address || !signature || !message) {
      res.status(400).json({ error: 'Missing address, signature, or message' });
      return;
    }

    // Verify the nonce was issued and hasn't expired
    const nonce = consumeNonce(address);
    if (!nonce) {
      res.status(401).json({ error: 'Invalid or expired nonce. Request a new one.' });
      return;
    }

    // Verify the signed message matches what we expected
    const expectedMessage = buildSignMessage(address, nonce);
    if (message !== expectedMessage) {
      res.status(401).json({ error: 'Message does not match expected format' });
      return;
    }

    // Verify the signature was produced by the claimed address
    if (!verifySignature(message, signature, address)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Fetch on-chain roles for the JWT
    const roles = await fetchWalletRoles(address);

    const token = signToken(address, roles);
    res.json({ token, address: address.toLowerCase(), roles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/auth/me — Get current authenticated user info
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // Refresh roles from on-chain
    const roles = await fetchWalletRoles(req.auth!.address);

    res.json({
      address: req.auth!.address,
      roles,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
