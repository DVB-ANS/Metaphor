import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';
import { cantonRouter } from './routes/canton.js';
import { aiRouter } from './routes/ai.js';

dotenv.config({ path: '../../.env' });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/canton', cantonRouter);
app.use('/api/ai', aiRouter);

// Placeholder route groups for Phase 3
// app.use('/api/adi', adiRouter);       — ADI bridge (tokenization + vaults)
// app.use('/api/hedera', hederaRouter); — Hedera bridge (coupon scheduling)

app.listen(PORT, () => {
  console.log(`InstiVault API running on http://localhost:${PORT}`);
});
