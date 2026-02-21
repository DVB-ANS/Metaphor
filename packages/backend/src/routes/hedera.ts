import { Router, Request, Response, type Router as RouterType } from 'express';
import { getHederaSigner, getContract, ADDRESSES } from '../config.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router: RouterType = Router();

// Optional auth on all routes
router.use(optionalAuth);

// ─── Bonds ──────────────────────────────────────────────────────────

router.get('/bonds', async (_req: Request, res: Response) => {
    try {
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler);
        const count = await scheduler.bondCount();
        const result = [];
        for (let i = 0; i < count; i++) {
            const bond = await scheduler.getBond(i);
            result.push({
                id: bond.id.toString(),
                token: bond.token,
                paymentToken: bond.paymentToken,
                faceValue: bond.faceValue.toString(),
                rate: bond.rate.toString(),
                frequency: bond.frequency,
                startDate: bond.startDate.toString(),
                maturityDate: bond.maturityDate.toString(),
                issuer: bond.issuer,
                active: bond.active,
            });
        }
        res.json(result);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/bonds/:id', async (req: Request, res: Response) => {
    try {
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler);
        const bond = await scheduler.getBond(req.params.id);
        const dates = await scheduler.getPaymentDates(req.params.id);
        const couponAmount = await scheduler.getCouponAmount(req.params.id);

        const payments = await Promise.all(
            dates.map(async (date: bigint) => {
                const payment = await scheduler.getPayment(req.params.id, date);
                return {
                    paymentDate: date.toString(),
                    amount: payment.amount.toString(),
                    status: payment.status,
                    scheduleAddress: payment.scheduleAddress,
                };
            }),
        );

        res.json({
            id: bond.id.toString(),
            token: bond.token,
            paymentToken: bond.paymentToken,
            faceValue: bond.faceValue.toString(),
            rate: bond.rate.toString(),
            frequency: bond.frequency,
            startDate: bond.startDate.toString(),
            maturityDate: bond.maturityDate.toString(),
            issuer: bond.issuer,
            active: bond.active,
            couponAmount: couponAmount.toString(),
            payments,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bonds', requireAuth, requireRole('ADMIN', 'ISSUER'), async (req: Request, res: Response) => {
    try {
        const { token, paymentToken, faceValue, rate, frequency, startDate, maturityDate, issuer } = req.body;
        const signer = getHederaSigner();
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler, signer);
        const tx = await scheduler.registerBond(token, paymentToken, faceValue, rate, frequency, startDate, maturityDate, issuer);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Scheduling ─────────────────────────────────────────────────────

router.post('/bonds/:id/schedule-all', requireAuth, requireRole('ISSUER', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const signer = getHederaSigner();
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler, signer);
        const tx = await scheduler.scheduleAllCoupons(req.params.id);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bonds/:id/schedule', requireAuth, requireRole('ISSUER', 'ADMIN'), async (req: Request, res: Response) => {
    try {
        const { paymentDate } = req.body;
        const signer = getHederaSigner();
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler, signer);
        const tx = await scheduler.scheduleCoupon(req.params.id, paymentDate);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/bonds/:bondId/payments/:date/recover', requireAuth, requireRole('ADMIN'), async (req: Request, res: Response) => {
    try {
        const signer = getHederaSigner();
        const scheduler = getContract('CouponScheduler', ADDRESSES.couponScheduler, signer);
        const tx = await scheduler.recoverPayment(req.params.bondId, req.params.date);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ─── Yield Distribution ─────────────────────────────────────────────

router.get('/yield/snapshots/:id', async (req: Request, res: Response) => {
    try {
        const distributor = getContract('YieldDistributor', ADDRESSES.yieldDistributor);
        const [token, paymentToken, totalYield, totalSupply, timestamp, claimedAmount, holderCount] =
            await distributor.getSnapshotInfo(req.params.id);
        res.json({
            id: req.params.id,
            token,
            paymentToken,
            totalYield: totalYield.toString(),
            totalSupply: totalSupply.toString(),
            timestamp: timestamp.toString(),
            claimedAmount: claimedAmount.toString(),
            holderCount: holderCount.toString(),
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/yield/distribute', requireAuth, requireRole('ADMIN', 'ISSUER'), async (req: Request, res: Response) => {
    try {
        const { token, paymentToken, totalYield, holders } = req.body;
        const signer = getHederaSigner();
        const distributor = getContract('YieldDistributor', ADDRESSES.yieldDistributor, signer);
        const tx = await distributor.distribute(token, paymentToken, totalYield, holders);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/yield/claim', requireAuth, requireRole('INVESTOR'), async (req: Request, res: Response) => {
    try {
        const { paymentToken, snapshotId } = req.body;
        const signer = getHederaSigner();
        const distributor = getContract('YieldDistributor', ADDRESSES.yieldDistributor, signer);
        const tx = await distributor.claimYield(paymentToken, snapshotId);
        const receipt = await tx.wait();
        res.json({ txHash: receipt.hash });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/yield/unclaimed/:holder/:paymentToken', async (req: Request, res: Response) => {
    try {
        const distributor = getContract('YieldDistributor', ADDRESSES.yieldDistributor);
        const unclaimed = await distributor.getUnclaimedYield(req.params.holder, req.params.paymentToken);
        res.json({ holder: req.params.holder, unclaimed: unclaimed.toString() });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
