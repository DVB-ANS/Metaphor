import { Router, type Router as RouterType } from 'express';

export const healthRouter: RouterType = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'metaphor-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
  });
});
