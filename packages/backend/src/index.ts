import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { cantonRouter } from './routes/canton.js';
import { aiRouter } from './routes/ai.js';
import adiRoutes from './routes/adi.js';
import hederaRoutes from './routes/hedera.js';
import demoRoutes from './routes/demo.js';
import v1Routes from './routes/v1.js';
import { initializeAIEngine } from 'ai-engine';
import { setUseMock } from './services/ai-client.js';

dotenv.config({ path: '../../.env' });

// ─── Initialize AI Engine (0G Compute or mock) ─────────────────
const aiUseMock = process.env.ZG_USE_MOCK !== 'false';
initializeAIEngine({
  zgRpcUrl: process.env.ZG_RPC_URL || '',
  zgPrivateKey: process.env.ZG_PRIVATE_KEY || '',
  useMock: aiUseMock,
}).then((ai) => {
  setUseMock(aiUseMock);
  console.log(`  AI engine:      ${ai.mode} mode`);
}).catch((err) => {
  console.warn(`  AI engine:      failed to initialize (${(err as Error).message}), falling back to mock`);
  setUseMock(true);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/adi', adiRoutes);
app.use('/api/hedera', hederaRoutes);
app.use('/api/canton', cantonRouter);
app.use('/api/ai', aiRouter);
app.use('/api/demo', demoRoutes);
app.use('/api/v1', v1Routes);

app.listen(PORT, () => {
  console.log(`Metaphor API running on http://localhost:${PORT}`);
  console.log(`  Auth endpoints:   http://localhost:${PORT}/api/auth`);
  console.log(`  ADI endpoints:    http://localhost:${PORT}/api/adi`);
  console.log(`  Hedera endpoints: http://localhost:${PORT}/api/hedera`);
  console.log(`  Canton endpoints: http://localhost:${PORT}/api/canton`);
  console.log(`  AI endpoints:     http://localhost:${PORT}/api/ai`);
});
