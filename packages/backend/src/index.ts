import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import adiRoutes from './routes/adi.js';
import hederaRoutes from './routes/hedera.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Health ─────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'instivault-backend' });
});

// ─── Routes ─────────────────────────────────────────────────────────

app.use('/api/adi', adiRoutes);
app.use('/api/hedera', hederaRoutes);

// ─── Start ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`InstiVault backend running on port ${PORT}`);
    console.log(`  ADI endpoints:    http://localhost:${PORT}/api/adi`);
    console.log(`  Hedera endpoints: http://localhost:${PORT}/api/hedera`);
});
