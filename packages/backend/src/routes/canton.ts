import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { cantonClient } from '../services/canton-client.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import type {
  CreateVaultBody,
  DepositAssetBody,
  InvitePartyBody,
  RequestTradeBody,
  AddCounterpartyBody,
} from '../types/canton.js';

export const cantonRouter: RouterType = Router();

// Optional auth on all Canton routes
cantonRouter.use(optionalAuth);

// ─── Helpers ─────────────────────────────────────────────────

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

function getParty(req: Request): string {
  return (req.headers['x-canton-party'] as string) || cantonClient.resolveParty('admin');
}

// ─── Vaults ──────────────────────────────────────────────────

// POST /api/canton/vaults — createCmd ConfidentialVault
cantonRouter.post('/vaults', requireAuth, async (req: Request, res: Response) => {
  try {
    const body = req.body as CreateVaultBody;
    const party = body.owner || getParty(req);

    const result = await cantonClient.create(
      'ConfidentialVault',
      {
        owner: party,
        vaultId: body.vaultId || `vault-${Date.now()}`,
        vaultName: body.name,
        description: body.description || '',
        assets: [],
        totalValue: '0.0',
        status: 'Active',
        counterparties: [],
      },
      party,
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/canton/vaults — query @ConfidentialVault (party-scoped)
cantonRouter.get('/vaults', async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const result = await cantonClient.query('ConfidentialVault', party);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/canton/vaults/:vaultId — fetch by contract ID
cantonRouter.get('/vaults/:vaultId', async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const result = await cantonClient.fetch('ConfidentialVault', param(req, 'vaultId'), party);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Assets (deposit / withdraw) ─────────────────────────────

// POST /api/canton/vaults/:vaultId/assets — exerciseCmd DepositAsset
cantonRouter.post('/vaults/:vaultId/assets', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const body = req.body as DepositAssetBody;

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'DepositAsset',
      {
        newAsset: {
          assetId: body.assetId,
          assetType: body.assetType || 'Bond',
          name: body.name,
          isin: body.isin || body.assetId,
          nominalValue: String(body.nominalValue),
          couponRate: String(body.couponRate),
          maturityDate: body.maturityDate,
          issuerName: body.jurisdiction || 'Unknown',
        },
      },
      party,
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/canton/vaults/:vaultId/assets/:assetId — exerciseCmd WithdrawAsset
cantonRouter.delete('/vaults/:vaultId/assets/:assetId', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'WithdrawAsset',
      { targetAssetId: param(req, 'assetId') },
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Invitations ─────────────────────────────────────────────

// POST /api/canton/vaults/:vaultId/invite — createCmd VaultInvitation
cantonRouter.post('/vaults/:vaultId/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const body = req.body as InvitePartyBody;

    const result = await cantonClient.create(
      'VaultInvitation',
      {
        vaultOwner: party,
        invitee: body.to,
        vaultId: param(req, 'vaultId'),
        vaultName: body.vaultName || '',
      },
      party,
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/invitations/:cid/accept — exerciseCmd Accept
cantonRouter.post('/invitations/:cid/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'VaultInvitation',
      param(req, 'cid'),
      'Accept',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/invitations/:cid/decline — exerciseCmd Decline
cantonRouter.post('/invitations/:cid/decline', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'VaultInvitation',
      param(req, 'cid'),
      'Decline',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Counterparties ──────────────────────────────────────────

// POST /api/canton/vaults/:vaultId/counterparties — exerciseCmd AddCounterparty
cantonRouter.post('/vaults/:vaultId/counterparties', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const body = req.body as AddCounterpartyBody;

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'AddCounterparty',
      { newCounterparty: body.party },
      party,
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/canton/vaults/:vaultId/counterparties/:party — exerciseCmd RemoveCounterparty
cantonRouter.delete(
  '/vaults/:vaultId/counterparties/:party',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const actingParty = getParty(req);

      const result = await cantonClient.exercise(
        'ConfidentialVault',
        param(req, 'vaultId'),
        'RemoveCounterparty',
        { party: param(req, 'party') },
        actingParty,
      );

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  },
);

// ─── Trades ──────────────────────────────────────────────────

// POST /api/canton/vaults/:vaultId/trades — exerciseCmd RequestTrade
cantonRouter.post('/vaults/:vaultId/trades', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const body = req.body as RequestTradeBody;

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'RequestTrade',
      {
        requester: party,
        assetId: body.assetId || body.assetName,
        offeredPrice: String(body.price),
        notes: body.message || '',
      },
      party,
    );

    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/trades/:cid/accept — exerciseCmd AcceptTrade
cantonRouter.post('/trades/:cid/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'TradeRequest',
      param(req, 'cid'),
      'AcceptTrade',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/trades/:cid/reject — exerciseCmd RejectTrade
cantonRouter.post('/trades/:cid/reject', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'TradeRequest',
      param(req, 'cid'),
      'RejectTrade',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/canton/trades — query @TradeRequest (party-scoped)
cantonRouter.get('/trades', async (req: Request, res: Response) => {
  try {
    const party = getParty(req);
    const result = await cantonClient.query('TradeRequest', party);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// ─── Vault Lifecycle ─────────────────────────────────────────

// POST /api/canton/vaults/:vaultId/freeze — exerciseCmd FreezeVault
cantonRouter.post('/vaults/:vaultId/freeze', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'FreezeVault',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/vaults/:vaultId/activate — exerciseCmd ActivateVault
cantonRouter.post('/vaults/:vaultId/activate', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'ActivateVault',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/canton/vaults/:vaultId/close — exerciseCmd CloseVault
cantonRouter.post('/vaults/:vaultId/close', requireAuth, async (req: Request, res: Response) => {
  try {
    const party = getParty(req);

    const result = await cantonClient.exercise(
      'ConfidentialVault',
      param(req, 'vaultId'),
      'CloseVault',
      {},
      party,
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});
