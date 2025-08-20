"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const generate_1 = require("./routes/generate");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((0, cors_1.default)({
    origin: function (origin, cb) {
        if (!origin || allowed.length === 0 || allowed.includes(origin))
            return cb(null, true);
        return cb(new Error('Not allowed by CORS: ' + origin));
    },
    credentials: true
}));
app.get('/health', (_, res) => res.json({ ok: true }));
// Static serving of generated PDFs
app.use('/outputs', express_1.default.static(path_1.default.join(__dirname, '..', 'public', 'outputs')));
// Routes
app.use('/api', generate_1.generateRouter);
app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
});
