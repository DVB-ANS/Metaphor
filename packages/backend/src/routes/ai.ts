import { Router, type Request, type Response, type Router as RouterType } from 'express';
import type { AnalyzeRequestBody } from '../types/ai.js';
import {
  analyzeVault,
  getReport,
  listReports,
  approveReport,
  rejectReport,
} from '../services/ai-client.js';

export const aiRouter: RouterType = Router();

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

// POST /api/ai/analyze — trigger 0G Compute inference on a vault
aiRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const body = req.body as AnalyzeRequestBody;

    if (!body.vaultId || !body.assets || !Array.isArray(body.assets)) {
      res.status(400).json({ error: 'Missing required fields: vaultId, assets[]' });
      return;
    }

    const report = await analyzeVault(body);
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/ai/reports — list all reports (optionally filter by vaultId)
aiRouter.get('/reports', (_req: Request, res: Response) => {
  const vaultId = _req.query.vaultId as string | undefined;
  const reports = listReports(vaultId);
  res.json({ reports });
});

// GET /api/ai/reports/:reportId — get a single report
aiRouter.get('/reports/:reportId', (req: Request, res: Response) => {
  const report = getReport(param(req, 'reportId'));
  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }
  res.json(report);
});

// POST /api/ai/reports/:reportId/approve — approve recommendation(s)
aiRouter.post('/reports/:reportId/approve', (req: Request, res: Response) => {
  const { recommendationId } = req.body as { recommendationId?: string };
  const report = approveReport(param(req, 'reportId'), recommendationId);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json(report);
});

// POST /api/ai/reports/:reportId/reject — reject recommendation(s)
aiRouter.post('/reports/:reportId/reject', (req: Request, res: Response) => {
  const { recommendationId } = req.body as { recommendationId?: string };
  const report = rejectReport(param(req, 'reportId'), recommendationId);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json(report);
});
