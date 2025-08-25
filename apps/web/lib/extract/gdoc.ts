import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

export async function exportGDocToDocx(fileId: string, kitDir: string, oauth2: any) {
  const drive = google.drive({ version: 'v3', auth: oauth2 });
  const res = await drive.files.export(
    {
      fileId,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
    { responseType: 'arraybuffer' }
  );
  await fs.mkdir(kitDir, { recursive: true });
  const out = path.join(kitDir, 'input.docx');
  await fs.writeFile(out, Buffer.from(res.data as ArrayBuffer));
  return out;
}
