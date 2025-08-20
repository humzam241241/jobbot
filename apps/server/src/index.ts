import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { generateRouter } from './routes/generate';

dotenv.config();

const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: function (origin, cb) {
    if (!origin || allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true
}));

app.get('/health', (_, res) => res.json({ ok: true }));

// Static serving of generated PDFs
app.use('/outputs', express.static(path.join(__dirname, '..', 'public', 'outputs')));

// Routes
app.use('/api', generateRouter);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
