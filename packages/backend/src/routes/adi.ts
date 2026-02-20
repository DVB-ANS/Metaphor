import { Router, Request, Response, type Router as RouterType } from 'express';
import { getAdiSigner, getContract, ADDRESSES } from '../config.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router: RouterType = Router();

// Optional auth on all routes (populates req.auth if token present)
router.use(optionalAuth);

// ─── Tokens ─────────────────────────────────────────────────────────

router.get('/tokens', async (_req: Request, res: Response) => {
    try {
        const factory = getContract('TokenFactory', ADDRESSES.tokenFactory);
        const tokens = await factory.getAllTokens();
        const result = await Promise.all(
            tokens.map(async (addr: string) => {
                const token = getContract('RWAToken', addr);
                const [isin, rate, maturity, issuer] = await token.getMetadata();
                const name = await token.name();
                const symbol = await token.symbol();
                const totalSupply = await token.totalSupply();
                return { address: addr, name, symbol, isin, rate: rate.toString(), maturity: maturity.toString(), issuer, totalSupply: totalSupply.toString() };
            }),
        );
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tokens', requireAuth, requireRole('ISSUER'), async (req: Request, res: Response) => {
    try {
        const { name, symbol, isin, rate, maturity, initialSupply } = req.body;
        const signer = getAdiSigner();
        const factory = getContract('TokenFactory', ADDRESSES.tokenFactory, signer);
        const tx = await factory.createToken({ name, symbol, isin, rate, maturity, initialSupply });
        const receipt = await tx.wait();
        const event = receipt.logs.find((l: any) => l.fragment?.name === 'TokenCreated');
        res.json({ txHash: receipt.hash, tokenAddress: event?.args?.[0] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/tokens/:address/fractionalize', requireAuth, requireRole('ISSUER'), async (req: Request, res: Response) => {
    try {
        const { fractions } = req.body;
        const signer = getAdiSigner();
        const factory = getContract('TokenFactory', ADDRESSES.tokenFactory, signer);
        const tx = await factory.fractionalize(req.params.address, fractions);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Vaults ─────────────────────────────────────────────────────────

router.post('/vaults', requireAuth, requireRole('ISSUER'), async (_req: Request, res: Response) => {
    try {
        const signer = getAdiSigner();
        const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);
        const tx = await vm.createVault();
        const receipt = await tx.wait();
        const event = receipt.logs.find((l: any) => l.fragment?.name === 'VaultCreated');
        res.json({ txHash: receipt.hash, vaultId: event?.args?.[0]?.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/vaults/:id', async (req: Request, res: Response) => {
    try {
        const vm = getContract('VaultManager', ADDRESSES.vaultManager);
        const [owner, status, createdAt] = await vm.getVaultInfo(req.params.id);
        const tokens = await vm.getVaultTokens(req.params.id);
        res.json({ vaultId: req.params.id, owner, status, createdAt: createdAt.toString(), tokens });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/vaults/:id/balance/:token', async (req: Request, res: Response) => {
    try {
        const vm = getContract('VaultManager', ADDRESSES.vaultManager);
        const balance = await vm.getVaultBalance(req.params.id, req.params.token);
        const available = await vm.getAvailableBalance(req.params.id, req.params.token);
        res.json({ balance: balance.toString(), available: available.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vaults/:id/deposit', requireAuth, requireRole('INVESTOR'), async (req: Request, res: Response) => {
    try {
        const { token, amount } = req.body;
        const signer = getAdiSigner();
        const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);
        const tx = await vm.deposit(req.params.id, token, amount);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vaults/:id/withdraw', requireAuth, requireRole('INVESTOR'), async (req: Request, res: Response) => {
    try {
        const { token, amount } = req.body;
        const signer = getAdiSigner();
        const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);
        const tx = await vm.withdraw(req.params.id, token, amount);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vaults/:id/allocate', requireAuth, requireRole('ISSUER'), async (req: Request, res: Response) => {
    try {
        const { token, strategy, amount } = req.body;
        const signer = getAdiSigner();
        const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);
        const tx = await vm.allocate(req.params.id, token, strategy, amount);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/vaults/:id/deallocate', requireAuth, requireRole('ISSUER'), async (req: Request, res: Response) => {
    try {
        const { token, strategy, amount } = req.body;
        const signer = getAdiSigner();
        const vm = getContract('VaultManager', ADDRESSES.vaultManager, signer);
        const tx = await vm.deallocate(req.params.id, token, strategy, amount);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Institutions ───────────────────────────────────────────────────

router.get('/institutions', async (_req: Request, res: Response) => {
    try {
        const registry = getContract('InstitutionRegistry', ADDRESSES.institutionRegistry);
        const count = await registry.getInstitutionCount();
        const result = [];
        for (let i = 0; i < count; i++) {
            const [name, admin, ac, factory, vault, active] = await registry.getInstitution(i);
            result.push({ id: i, name, admin, accessControl: ac, tokenFactory: factory, vaultManager: vault, active });
        }
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/institutions', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const { name, admin } = req.body;
        const signer = getAdiSigner();
        const registry = getContract('InstitutionRegistry', ADDRESSES.institutionRegistry, signer);
        const tx = await registry.registerInstitution(name, admin);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/institutions/propose', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const { name, admin } = req.body;
        const signer = getAdiSigner();
        const registry = getContract('InstitutionRegistry', ADDRESSES.institutionRegistry, signer);
        const tx = await registry.proposeInstitution(name, admin);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/institutions/proposals/:id/approve', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const signer = getAdiSigner();
        const registry = getContract('InstitutionRegistry', ADDRESSES.institutionRegistry, signer);
        const tx = await registry.approveProposal(req.params.id);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/institutions/proposals/:id/execute', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const signer = getAdiSigner();
        const registry = getContract('InstitutionRegistry', ADDRESSES.institutionRegistry, signer);
        const tx = await registry.executeProposal(req.params.id);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
