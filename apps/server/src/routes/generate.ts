import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';

import { extractTextFromFile } from '../utils/extract';
import { generateWithProvider } from '../ai/providers';
import { writePdfFromMarkdown } from '../utils/pdf';

const upload = multer({ dest: path.join(process.cwd(), 'tmp') });
export const generateRouter = Router();

async function fetchJobText(url: string): Promise<string> {
  const res = await axios.get(url, { timeout: 15000 });
  const html = res.data as string;
  const $ = cheerio.load(html);
  // crude extraction
  $('script, style, noscript').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  // Return first ~10k chars to avoid over-long prompts
  return text.slice(0, 10000);
}

generateRouter.post('/generate', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const { job_url } = req.body as { job_url: string };

    if (!file || !job_url) {
      return res.status(400).json({ error: 'file and job_url are required' });
    }

    const resumeText = await extractTextFromFile(file.path, file.mimetype || '');
    const jobText = await fetchJobText(job_url);

    const { resume_md, cover_letter_md } = await generateWithProvider(
      (process.env.AI_PROVIDER as any) || 'deepseek',
      { resumeText, jobText }
    );

    const id = uuidv4();
    const outDir = path.join(__dirname, '..', 'public', 'outputs');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const resumePath = path.join(outDir, `${id}_resume.pdf`);
    const clPath = path.join(outDir, `${id}_cover_letter.pdf`);

    await writePdfFromMarkdown(resume_md, resumePath);
    await writePdfFromMarkdown(cover_letter_md, clPath);

    // Clean temp upload
    fs.unlink(file.path, () => {});

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const resumeUrl = `${baseUrl}/outputs/${path.basename(resumePath)}`;
    const clUrl = `${baseUrl}/outputs/${path.basename(clPath)}`;

    return res.json({
      ok: true,
      id,
      resume_url: resumeUrl,
      cover_letter_url: clUrl
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || 'Internal error' });
  }
});
