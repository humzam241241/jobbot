"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const uuid_1 = require("uuid");
const extract_1 = require("../utils/extract");
const providers_1 = require("../ai/providers");
const pdf_1 = require("../utils/pdf");
const upload = (0, multer_1.default)({ dest: path_1.default.join(process.cwd(), 'tmp') });
exports.generateRouter = (0, express_1.Router)();
async function fetchJobText(url) {
    const res = await axios_1.default.get(url, { timeout: 15000 });
    const html = res.data;
    const $ = cheerio.load(html);
    // crude extraction
    $('script, style, noscript').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    // Return first ~10k chars to avoid over-long prompts
    return text.slice(0, 10000);
}
exports.generateRouter.post('/generate', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const { job_url } = req.body;
        if (!file || !job_url) {
            return res.status(400).json({ error: 'file and job_url are required' });
        }
        const resumeText = await (0, extract_1.extractTextFromFile)(file.path, file.mimetype || '');
        const jobText = await fetchJobText(job_url);
        const { resume_md, cover_letter_md } = await (0, providers_1.generateWithProvider)(process.env.AI_PROVIDER || 'deepseek', { resumeText, jobText });
        const id = (0, uuid_1.v4)();
        const outDir = path_1.default.join(__dirname, '..', 'public', 'outputs');
        if (!fs_1.default.existsSync(outDir))
            fs_1.default.mkdirSync(outDir, { recursive: true });
        const resumePath = path_1.default.join(outDir, `${id}_resume.pdf`);
        const clPath = path_1.default.join(outDir, `${id}_cover_letter.pdf`);
        await (0, pdf_1.writePdfFromMarkdown)(resume_md, resumePath);
        await (0, pdf_1.writePdfFromMarkdown)(cover_letter_md, clPath);
        // Clean temp upload
        fs_1.default.unlink(file.path, () => { });
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const resumeUrl = `${baseUrl}/outputs/${path_1.default.basename(resumePath)}`;
        const clUrl = `${baseUrl}/outputs/${path_1.default.basename(clPath)}`;
        return res.json({
            ok: true,
            id,
            resume_url: resumeUrl,
            cover_letter_url: clUrl
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: err?.message || 'Internal error' });
    }
});
